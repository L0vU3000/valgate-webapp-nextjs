"use server";

import { z } from "zod";
import { requestAccess, AccessError } from "@/lib/services/managers";
import {
  createClientRecord,
  nameToInitials,
  nameToAvatarBg,
} from "@/lib/services/client-onboarding";
import * as clientsDb from "@/lib/data/db/clients";
import { db } from "@/lib/db/client";
import { clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateProperty } from "@/lib/services/properties";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/services/activity";
import { revalidatePro, type ProActionResult } from "./_lib/revalidate";

// --- Clients -------------------------------------------------------------------

const onboardClientSchema = z.object({
  name: z.string().min(2).max(120),
  clientType: z.enum(["Individual", "Corporate"]),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  managementFeePct: z.number().min(0).max(100).optional(),
  propertyIds: z.array(z.string().min(1)).default([]),
});

export async function onboardClient(input: {
  name: string;
  clientType: "Individual" | "Corporate";
  email?: string;
  phone?: string;
  managementFeePct?: number;
  propertyIds?: string[];
}): Promise<ProActionResult> {
  const parsed = onboardClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const userId = getCurrentUserId();
  const authCtx = await requireCtx();

  // Write to Neon (canonical) + FS mirror. orgId=null = manual wizard client (no portfolio org).
  const clientId = await createClientRecord(
    authCtx.userId,
    null,
    parsed.data.name,
    parsed.data.email,
    userId,
  );

  // Best-effort: patch FS record with wizard-only fields the Neon schema doesn't store.
  // Non-fatal if this fails — Neon is the authoritative store.
  try {
    await clientsDb.update(userId, clientId, {
      phone: parsed.data.phone,
      managementFeePct: parsed.data.managementFeePct,
      clientType: parsed.data.clientType,
    });
  } catch (err) {
    logger.error("onboardClient: FS extra-field patch failed (non-fatal)", { error: String(err) });
  }

  for (const propertyId of parsed.data.propertyIds) {
    const updated = await updateProperty(authCtx, propertyId, {
      clientId,
    });
    if (!updated) {
      logger.error("onboardClient: property not found", { propertyId });
      return { ok: false, error: "Client created, but a property assignment failed." };
    }
  }

  revalidatePro();
  return { ok: true };
}

// Schema for setting a client's active/inactive status.
const setClientStatusSchema = z.object({
  clientId: z.string().min(1),
  // "Inactive" archives the client: they vanish from rollups and alerts.
  // "Active" restores them. The field is optional in ClientSchema (absent = Active),
  // so this is always a forward write — never relies on the field already existing.
  status: z.enum(["Active", "Inactive"]),
});

// Archives (or reactivates) a client. An Inactive client drops out of all
// Pro rollups, alerts, and the active client book. Reactivating sets them back.
// Neon is the authoritative store; FS is updated as a best-effort mirror.
export async function setClientStatus(input: {
  clientId: string;
  status: "Active" | "Inactive";
}): Promise<ProActionResult> {
  const parsed = setClientStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const userId = getCurrentUserId();
  const ctx = await requireCtx();

  // IDOR check: verify the client belongs to this manager.
  // Check Neon first (post-migration clients), fall back to FS (legacy manual-wizard clients).
  const [neonClient] = await db
    .select({ name: clients.name })
    .from(clients)
    .where(
      and(
        eq(clients.id, parsed.data.clientId),
        eq(clients.managerUserId, ctx.userId),
      ),
    )
    .limit(1);

  const fsClient = neonClient ? null : await clientsDb.get(userId, parsed.data.clientId);
  const clientName = neonClient?.name ?? fsClient?.name;

  if (!clientName) {
    logger.error("setClientStatus: client not found", input);
    return { ok: false, error: "Client not found." };
  }

  // Map display enum → DB lowercase enum.
  const dbStatus = parsed.data.status === "Active" ? ("active" as const) : ("inactive" as const);

  // Neon update — only for clients that live in Neon (post-migration).
  if (neonClient) {
    await db
      .update(clients)
      .set({ status: dbStatus, updatedAt: new Date() })
      .where(eq(clients.id, parsed.data.clientId));
  }

  // FS mirror — best-effort for Neon clients; authoritative for legacy-only clients.
  try {
    const updated = await clientsDb.update(userId, parsed.data.clientId, {
      status: parsed.data.status,
    });
    if (!updated && !neonClient) {
      logger.error("setClientStatus: FS update failed for legacy client", input);
      return { ok: false, error: "Could not update client status." };
    }
  } catch (err) {
    if (!neonClient) {
      logger.error("setClientStatus: FS update threw for legacy client", { error: String(err) });
      return { ok: false, error: "Could not update client status." };
    }
    logger.error("setClientStatus: FS mirror update failed (non-fatal)", { error: String(err) });
  }

  // Activity log — non-critical; never rolls back the status change.
  try {
    await logActivity(ctx, {
      entity: "client",
      action: parsed.data.status === "Inactive" ? "archived" : "updated",
      entityId: parsed.data.clientId,
      summary: `Client ${clientName} ${parsed.data.status === "Inactive" ? "archived" : "reactivated"}`,
    });
  } catch (err) {
    console.error("setClientStatus: audit log failed", err);
  }

  revalidatePro();
  return { ok: true };
}

// Schema for editing a client's core details. Name is required; email is the
// manager's contact label (optional) and is NOT the client's login email —
// editing it here never touches the client's real account. An empty string is
// accepted and normalised to null so clearing the field works.
const updateClientSchema = z.object({
  clientId: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email().max(200).or(z.literal("")).optional(),
  clientType: z.enum(["Individual", "Corporate"]),
});

// Edits a client's name, contact email, and type. This mutates ONLY the
// manager-owned `clients` record (their private label for the engagement) —
// it never writes through to the client's Clerk identity or profile. Modeled
// on setClientStatus: validate -> auth -> ownership check -> Neon (canonical)
// -> FS mirror -> audit log.
export async function updateClient(input: {
  clientId: string;
  name: string;
  email?: string;
  clientType: "Individual" | "Corporate";
}): Promise<ProActionResult> {
  // 1. Reject anything malformed before touching the DB.
  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    // Surface the first authored validation message (e.g. "Name is required").
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const userId = getCurrentUserId();
  const ctx = await requireCtx();

  // 2. IDOR guard: the client must belong to THIS manager. Check Neon first
  //    (post-migration clients); fall back to the FS record for legacy
  //    manual-wizard clients — the same lookup setClientStatus uses.
  const [neonClient] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, parsed.data.clientId),
        eq(clients.managerUserId, ctx.userId),
      ),
    )
    .limit(1);

  const fsClient = neonClient ? null : await clientsDb.get(userId, parsed.data.clientId);
  if (!neonClient && !fsClient) {
    logger.error("updateClient: client not found", { clientId: parsed.data.clientId });
    return { ok: false, error: "Client not found." };
  }

  // 3. Derive the avatar visuals from the (possibly new) name so the initials
  //    and colour stay in sync with the label everywhere it renders.
  const name = parsed.data.name;
  const email = parsed.data.email && parsed.data.email.trim() ? parsed.data.email.trim() : null;
  const initials = nameToInitials(name);
  const avatarBg = nameToAvatarBg(name);

  // 4. Neon update — the canonical store.
  if (neonClient) {
    await db
      .update(clients)
      .set({
        name,
        email,
        clientType: parsed.data.clientType,
        initials,
        avatarBg,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, parsed.data.clientId));
  }

  // 5. FS mirror — authoritative for legacy-only clients, best-effort otherwise.
  try {
    const updated = await clientsDb.update(userId, parsed.data.clientId, {
      name,
      email: email ?? undefined,
      clientType: parsed.data.clientType,
      initials,
      avatarBg,
    });
    if (!updated && !neonClient) {
      logger.error("updateClient: FS update failed for legacy client", { clientId: parsed.data.clientId });
      return { ok: false, error: "Could not update client." };
    }
  } catch (err) {
    if (!neonClient) {
      logger.error("updateClient: FS update threw for legacy client", { error: String(err) });
      return { ok: false, error: "Could not update client." };
    }
    logger.error("updateClient: FS mirror update failed (non-fatal)", { error: String(err) });
  }

  // 6. Audit log — never rolls back the update.
  try {
    await logActivity(ctx, {
      entity: "client",
      action: "updated",
      entityId: parsed.data.clientId,
      summary: `Client ${name} details updated`,
    });
  } catch (err) {
    console.error("updateClient: audit log failed", err);
  }

  revalidatePro();
  return { ok: true };
}

// --- Managed accounts (Pro-2.2) ---------------------------------------------

const requestAccessSchema = z.object({
  // The owner-issued invite code. Trimmed + length-bounded; the service does the
  // real lookup. We don't constrain the character set here (codes are owner-defined).
  inviteCode: z.string().trim().min(1).max(64),
  level: z.enum(["view", "full"]),
});

// A manager requests access to an owner account by invite code. The service
// (requestAccess) enforces the manager guard, looks up the org, blocks duplicates,
// and notifies the owner. AccessError messages are written to be shown to the user;
// any other error is logged and generic-ed so internals never leak (security C5).
export async function requestAccessAction(input: {
  inviteCode: string;
  level: "view" | "full";
}): Promise<ProActionResult> {
  const parsed = requestAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter an invite code and access level." };

  const authCtx = await requireCtx();
  try {
    await requestAccess(authCtx, parsed.data.inviteCode, parsed.data.level);
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("requestAccessAction: unexpected failure", { error: String(err) });
    return { ok: false, error: "Could not request access. Please try again." };
  }

  revalidatePro();
  return { ok: true };
}

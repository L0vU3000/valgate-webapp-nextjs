"use server";

import { z } from "zod";
import { requestAccess, AccessError } from "@/lib/services/managers";
import {
  createClientRecord,
  setClientStatusRecord,
  updateClientRecord,
} from "@/lib/services/client-records";
import { updateProperty } from "@/lib/services/properties";
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

  const authCtx = await requireCtx();

  // Neon-only write. orgId=null = manual wizard client (no portfolio org).
  // The wizard-only fields (phone, fee, type) live in real columns since
  // migration 0023 — no FS mirror needed.
  const clientId = await createClientRecord(
    authCtx.userId,
    null,
    parsed.data.name,
    parsed.data.email,
    {
      clientType: parsed.data.clientType,
      phone: parsed.data.phone,
      managementFeePct: parsed.data.managementFeePct,
    },
  );

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
// Neon is the only store — the FS mirror was retired after parity was verified.
export async function setClientStatus(input: {
  clientId: string;
  status: "Active" | "Inactive";
}): Promise<ProActionResult> {
  const parsed = setClientStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const ctx = await requireCtx();

  // Map display enum → DB lowercase enum.
  const dbStatus = parsed.data.status === "Active" ? ("active" as const) : ("inactive" as const);

  // The service call does the IDOR check and the update in one ownership-scoped
  // query: a client id that isn't this manager's matches nothing and returns null.
  const clientName = await setClientStatusRecord(ctx, parsed.data.clientId, dbStatus);
  if (clientName === null) {
    logger.error("setClientStatus: client not found", input);
    return { ok: false, error: "Client not found." };
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
// on setClientStatus: validate -> auth -> ownership-scoped update -> audit log.
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

  const ctx = await requireCtx();

  // 2. Normalise the optional email — empty string means "clear the field".
  const name = parsed.data.name;
  const email = parsed.data.email && parsed.data.email.trim() ? parsed.data.email.trim() : null;

  // 3. Ownership-scoped update (IDOR guard lives in the service WHERE clause);
  //    the service also re-derives initials + avatar colour from the new name.
  const updated = await updateClientRecord(ctx, parsed.data.clientId, {
    name,
    email,
    clientType: parsed.data.clientType,
  });
  if (!updated) {
    logger.error("updateClient: client not found", { clientId: parsed.data.clientId });
    return { ok: false, error: "Client not found." };
  }

  // 4. Audit log — never rolls back the update.
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

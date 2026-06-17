import "server-only"; // C1
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  pillarVerifications, verificationEvidence, verificationEvents, documents, properties, ownershipRecords,
} from "@/lib/db/schema";
import { PillarVerificationSchema, type Pillar, type PillarVerification } from "@/lib/data/types/pillar-verification";
import { toDomain, nextId, type Ctx } from "@/lib/services/_mapping";
import { requireMember } from "@/lib/services/_crud";
import { assertCanMutate } from "@/lib/services/_mapping";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const rowToVerification = (r: typeof pillarVerifications.$inferSelect): PillarVerification =>
  PillarVerificationSchema.parse(toDomain(pillarVerifications, r));

// Allowed from-states for submitVerification (v1 self-attest runs submit→approve in one tx).
const SUBMIT_FROM = new Set(["unverified", "rejected", "revoked"]);

async function projectLegacy(
  tx: Tx,
  ctx: Ctx,
  propertyId: string,
  pillar: Pillar,
  verified: boolean,
  now: Date,
  docIds: string[],
  ownershipRecordId?: string,
): Promise<void> {
  const verifiedAt = verified ? now : null;
  const evidenceDocIds = verified && docIds.length ? docIds : null;
  const propScope = and(eq(properties.orgId, ctx.orgId), eq(properties.id, propertyId));
  if (pillar === "location") {
    await tx.update(properties).set({ locationVerified: verified, locationVerifiedAt: verifiedAt, locationEvidenceDocIds: evidenceDocIds }).where(propScope);
  } else if (pillar === "financials") {
    await tx.update(properties).set({ financialsVerified: verified, financialsVerifiedAt: verifiedAt, financialsEvidenceDocIds: evidenceDocIds }).where(propScope);
  } else if (pillar === "rental") {
    await tx.update(properties).set({ rentalVerified: verified, rentalVerifiedAt: verifiedAt, rentalEvidenceDocIds: evidenceDocIds }).where(propScope);
  } else if (pillar === "estate") {
    await tx.update(properties).set({ estateVerified: verified, estateVerifiedAt: verifiedAt, estateEvidenceDocIds: evidenceDocIds }).where(propScope);
  } else if (pillar === "ownership" && ownershipRecordId) {
    await tx.update(ownershipRecords)
      .set({ verified, verifiedAt, evidenceDocIds: evidenceDocIds ?? null })
      .where(and(eq(ownershipRecords.orgId, ctx.orgId), eq(ownershipRecords.id, ownershipRecordId)));
  }
  // safety / valuation / documents: no legacy columns
}

export async function submitVerification(
  ctx: Ctx,
  propertyId: string,
  pillar: Pillar,
  docIds: string[],
  ownershipRecordId?: string,
): Promise<PillarVerification> {
  assertCanMutate();
  requireMember(ctx);

  // ponytail: nextId uses module-level db, not tx — gaps on rollback are fine (ids are unique+monotonic, not gapless)
  const vrfId = await nextId("VRF");
  const vevIds = await Promise.all(docIds.map(() => nextId("VEV")));
  const [vheSubmit, vheApprove] = await Promise.all([nextId("VHE"), nextId("VHE")]);

  const now = new Date();

  return db.transaction(async (tx) => {
    // 1. Read current state org-scoped; assert legal from-state
    const [existing] = await tx.select({ status: pillarVerifications.status, id: pillarVerifications.id })
      .from(pillarVerifications)
      .where(and(
        eq(pillarVerifications.orgId, ctx.orgId),
        eq(pillarVerifications.propertyId, propertyId),
        eq(pillarVerifications.pillar, pillar),
      ));
    if (existing && !SUBMIT_FROM.has(existing.status)) throw new Error("illegal transition");

    // 2. Upsert to verified (onConflict on uq_property_pillar)
    const [vrf] = await tx.insert(pillarVerifications).values({
      id: vrfId,
      orgId: ctx.orgId,
      userId: ctx.userId,
      propertyId,
      pillar,
      status: "verified",
      method: "document_upload",
      submittedAt: now,
      decidedAt: now,
      decidedBy: ctx.userId,
    }).onConflictDoUpdate({
      target: [pillarVerifications.propertyId, pillarVerifications.pillar],
      set: {
        status: "verified",
        userId: ctx.userId,
        method: "document_upload",
        submittedAt: now,
        decidedAt: now,
        decidedBy: ctx.userId,
      },
    }).returning();

    if (!vrf) throw new Error("upsert returned no row");

    // 3. Validate each doc belongs to ctx.orgId, insert evidence
    for (let i = 0; i < docIds.length; i++) {
      const docId = docIds[i]!;
      const [doc] = await tx.select({ id: documents.id }).from(documents)
        .where(and(eq(documents.orgId, ctx.orgId), eq(documents.id, docId)));
      if (!doc) throw new Error(`document ${docId} not found in org`);
      await tx.insert(verificationEvidence).values([{ id: vevIds[i]!, verificationId: vrf.id, documentId: docId }]);
    }

    // 4. Insert submitted + approved events (v1 auto-approve)
    await tx.insert(verificationEvents).values([
      { id: vheSubmit, verificationId: vrf.id, event: "submitted", actorId: ctx.userId, at: now },
      { id: vheApprove, verificationId: vrf.id, event: "approved", actorId: ctx.userId, at: now },
    ]);

    // 5. Project to legacy columns
    await projectLegacy(tx, ctx, propertyId, pillar, true, now, docIds, ownershipRecordId);

    return rowToVerification(vrf);
  });
}

export async function revokeVerification(
  ctx: Ctx,
  propertyId: string,
  pillar: Pillar,
  ownershipRecordId?: string,
): Promise<PillarVerification> {
  assertCanMutate();
  requireMember(ctx);

  // ponytail: nextId outside tx — gap on rollback is fine
  const vheId = await nextId("VHE");
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ status: pillarVerifications.status, id: pillarVerifications.id })
      .from(pillarVerifications)
      .where(and(
        eq(pillarVerifications.orgId, ctx.orgId),
        eq(pillarVerifications.propertyId, propertyId),
        eq(pillarVerifications.pillar, pillar),
      ));
    if (!existing || existing.status !== "verified") throw new Error("illegal transition");

    const [vrf] = await tx.update(pillarVerifications)
      .set({ status: "revoked", decidedAt: now, decidedBy: ctx.userId })
      .where(and(
        eq(pillarVerifications.orgId, ctx.orgId),
        eq(pillarVerifications.propertyId, propertyId),
        eq(pillarVerifications.pillar, pillar),
      ))
      .returning();

    if (!vrf) throw new Error("update returned no row");
    await tx.insert(verificationEvents).values([{ id: vheId, verificationId: vrf.id, event: "revoked", actorId: ctx.userId, at: now }]);
    await projectLegacy(tx, ctx, propertyId, pillar, false, now, [], ownershipRecordId);

    return rowToVerification(vrf);
  });
}

export async function getVerification(ctx: Ctx, propertyId: string, pillar: Pillar): Promise<PillarVerification | null> {
  const [row] = await db.select().from(pillarVerifications)
    .where(and(eq(pillarVerifications.orgId, ctx.orgId), eq(pillarVerifications.propertyId, propertyId), eq(pillarVerifications.pillar, pillar)));
  return row ? rowToVerification(row) : null;
}

export async function listVerifications(ctx: Ctx, propertyId: string): Promise<PillarVerification[]> {
  const rows = await db.select().from(pillarVerifications)
    .where(and(eq(pillarVerifications.orgId, ctx.orgId), eq(pillarVerifications.propertyId, propertyId)));
  return rows.map(rowToVerification);
}

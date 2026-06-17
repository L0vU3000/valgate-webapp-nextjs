import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { certifications } from "@/lib/db/schema";
import { CertificationSchema, type Certification } from "@/lib/data/types/certification";
import type { NewCertification, CertificationPatch } from "@/lib/data/types/certification";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToCertification = (r: typeof certifications.$inferSelect): Certification =>
  CertificationSchema.parse(toDomain(certifications, r)); // C6/C7

export async function listCertifications(ctx: Ctx, propertyId?: string): Promise<Certification[]> {
  const rows = await db.select().from(certifications)
    .where(propertyId
      ? and(eq(certifications.orgId, ctx.orgId), eq(certifications.propertyId, propertyId))
      : eq(certifications.orgId, ctx.orgId)) // C3
    .orderBy(asc(certifications.issuedAt), asc(certifications.id))
    .limit(500)
  return rows.map(rowToCertification);
}

export async function getCertification(ctx: Ctx, id: string): Promise<Certification | null> {
  const [row] = await db.select().from(certifications)
    .where(and(eq(certifications.orgId, ctx.orgId), eq(certifications.id, id))); // C3
  return row ? rowToCertification(row) : null;
}

export async function createCertification(ctx: Ctx, input: NewCertification): Promise<Certification> {
  const now = Date.now();
  return scopedInsert(ctx, certifications, "CERT", { ...input, createdAt: now, updatedAt: now }, rowToCertification);
}

export async function updateCertification(ctx: Ctx, id: string, patch: CertificationPatch): Promise<Certification | null> {
  return scopedUpdate(ctx, certifications, id, patch, rowToCertification, true);
}

export async function deleteCertification(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, certifications, id);
}

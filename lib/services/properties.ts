import "server-only"; // C1
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  properties, leases, payments, documents,
  tenants, expenses, landParcels, propertyValuations,
  coOwners, ownershipRecords, ownershipDocuments, ownershipHistory,
  inspections, certifications, safetyRisks, emergencyContacts, maintenanceItems,
  pillarVerifications,
} from "@/lib/db/schema";
import { PropertySchema, type Property } from "@/lib/data/types/property";
import type { NewProperty, PropertyPatch } from "@/lib/data/types/property";
import { toDomain, nextId, type Ctx } from "@/lib/services/_mapping";
import { scopedUpdate, scopedDelete, requireMember } from "@/lib/services/_crud";
import { convertRowToDb } from "@/lib/db/column-classifier";
import { listDocuments } from "@/lib/services/documents";
import { deleteStorageObject } from "@/lib/services/storage";

const rowToProperty = (r: typeof properties.$inferSelect): Property =>
  PropertySchema.parse(toDomain(properties, r)); // C6/C7

export async function listProperties(ctx: Ctx): Promise<Property[]> {
  const rows = await db.select().from(properties)
    .where(eq(properties.orgId, ctx.orgId)) // C3
    .orderBy(asc(properties.createdAt), asc(properties.id))
    .limit(500)
  return rows.map(rowToProperty);
}

export async function getProperty(ctx: Ctx, id: string): Promise<Property | null> {
  const [row] = await db.select().from(properties)
    .where(and(eq(properties.orgId, ctx.orgId), eq(properties.id, id))); // C3
  return row ? rowToProperty(row) : null;
}

export async function createProperty(ctx: Ctx, input: NewProperty): Promise<Property> {
  requireMember(ctx);
  const id = await nextId("PROP");
  const now = Date.now();
  const merged = PropertySchema.parse({
    ...input,
    id,
    userId: ctx.userId,
    code: id,
    createdAt: now,
    updatedAt: now,
  });
  const [row] = await db.insert(properties).values({
    ...convertRowToDb(properties, merged as Record<string, unknown>),
    orgId: ctx.orgId,
  } as never).returning();
  return rowToProperty(row!);
}

export async function updateProperty(ctx: Ctx, id: string, patch: PropertyPatch): Promise<Property | null> {
  return scopedUpdate(ctx, properties, id, { ...patch, updatedAt: Date.now() }, rowToProperty, true);
}

// Permanently deletes a property and all its children.
//
// Why it works in 3 steps — gather, delete, cleanup — and not the reverse:
//   1. GATHER storage ids FIRST, before the DB rows vanish. We need the S3 object keys
//      from the property's photo list and from every document row. Once the DB row is gone,
//      those keys are lost forever (orphaned bytes).
//   2. ATOMIC CASCADE DELETE via scopedDelete. The database now has ON DELETE CASCADE on all
//      21 child FKs, so a single DELETE on `properties` removes leases, payments, tenants,
//      documents, folders, verifications, ownership rows, safety rows, etc. in one transaction.
//      The 3 nullable FKs (payments.propertyId, estate_activity_events.propertyId,
//      notifications.propertyId) are SET NULL so those rows survive but lose the property link.
//   3. BEST-EFFORT S3 cleanup loop after the DB commit. If an S3 delete fails we log it and
//      move on — the real delete already succeeded, and a failed storage cleanup must not make
//      it look like the property is still there.
//
// scopedDelete inside enforces org-scope (WHERE orgId = ctx.orgId) AND requires admin role,
// so a viewer/member reaching this function is rejected at the service layer as well.
export async function deleteProperty(ctx: Ctx, id: string): Promise<void> {
  // Step 1: collect all S3 keys we will need to clean up after the DB delete.
  // We read the property row for its photoStorageIds, and list all document rows for their
  // storageId / thumbStorageId. All reads are org-scoped.
  const [propertyRow] = await db
    .select({ photoStorageIds: properties.photoStorageIds })
    .from(properties)
    .where(and(eq(properties.orgId, ctx.orgId), eq(properties.id, id)));

  const storageIdsToDelete: string[] = [];

  if (propertyRow) {
    // Photo storage ids live directly on the property row.
    for (const sid of propertyRow.photoStorageIds ?? []) {
      if (sid) storageIdsToDelete.push(sid);
    }
  }

  // Document storage ids (main file + optional thumbnail).
  const docList = await listDocuments(ctx, id);
  for (const doc of docList) {
    if (doc.storageId) storageIdsToDelete.push(doc.storageId);
    if (doc.thumbStorageId) storageIdsToDelete.push(doc.thumbStorageId);
  }

  // Step 2: atomically delete the property row. The DB cascades to all 18 child tables and
  // sets null on the 3 nullable FKs — one transaction, no partial-failure risk.
  await scopedDelete(ctx, properties, id);

  // Step 3: clean up S3 objects. Best-effort: a failed S3 delete is logged but never throws,
  // so it cannot make a completed DB delete look like it failed.
  for (const sid of storageIdsToDelete) {
    await deleteStorageObject(sid); // already never-throws — see storage.ts
  }
}

// The shape returned by countPropertyCascade — used by the delete-confirm dialog to show
// the user a blast-radius summary ("you are about to destroy N leases, N payments, …").
export type PropertyCascadeCounts = {
  // Headline counts — shown individually in the confirm dialog.
  leases: number;
  payments: number;
  documents: number;
  // Supporting entity counts — shown as a combined "and N other records" line.
  tenants: number;
  expenses: number;
  landParcels: number;
  propertyValuations: number;
  coOwners: number;
  ownershipRecords: number;
  ownershipDocuments: number;
  ownershipHistory: number;
  inspections: number;
  certifications: number;
  safetyRisks: number;
  emergencyContacts: number;
  maintenanceItems: number;
  pillarVerifications: number;
  // Derived: sum of all supporting entity counts for the "and N other records" label.
  otherTotal: number;
};

// Counts every child row that will be destroyed when this property is hard-deleted.
// All queries are org-scoped (WHERE orgId = ctx.orgId) so one org can never probe another's data.
//
// Payments are not linked to a property directly — they hang off a lease — so we first
// gather the property's lease ids and then count payments referencing those leases.
// Every other table links to the property directly.
export async function countPropertyCascade(ctx: Ctx, propertyId: string): Promise<PropertyCascadeCounts> {
  // Collect all query promises in parallel so we hit the DB in one round-trip burst
  // rather than issuing 16 sequential queries.
  const [
    leaseRows,
    [tenantCount],
    [expenseCount],
    [landParcelCount],
    [valuationCount],
    [coOwnerCount],
    [ownershipRecordCount],
    [ownershipDocCount],
    [ownershipHistoryCount],
    [inspectionCount],
    [certCount],
    [riskCount],
    [contactCount],
    [maintenanceCount],
    [documentCount],
    [verificationCount],
  ] = await Promise.all([
    // Leases — gathered as rows so we can reuse their ids for the payments sub-query below.
    db.select({ id: leases.id })
      .from(leases)
      .where(and(eq(leases.orgId, ctx.orgId), eq(leases.propertyId, propertyId))),

    // Direct property children — each returns a single { count } row.
    db.select({ count: count() }).from(tenants)
      .where(and(eq(tenants.orgId, ctx.orgId), eq(tenants.propertyId, propertyId))),
    db.select({ count: count() }).from(expenses)
      .where(and(eq(expenses.orgId, ctx.orgId), eq(expenses.propertyId, propertyId))),
    db.select({ count: count() }).from(landParcels)
      .where(and(eq(landParcels.orgId, ctx.orgId), eq(landParcels.propertyId, propertyId))),
    db.select({ count: count() }).from(propertyValuations)
      .where(and(eq(propertyValuations.orgId, ctx.orgId), eq(propertyValuations.propertyId, propertyId))),
    db.select({ count: count() }).from(coOwners)
      .where(and(eq(coOwners.orgId, ctx.orgId), eq(coOwners.propertyId, propertyId))),
    db.select({ count: count() }).from(ownershipRecords)
      .where(and(eq(ownershipRecords.orgId, ctx.orgId), eq(ownershipRecords.propertyId, propertyId))),
    db.select({ count: count() }).from(ownershipDocuments)
      .where(and(eq(ownershipDocuments.orgId, ctx.orgId), eq(ownershipDocuments.propertyId, propertyId))),
    db.select({ count: count() }).from(ownershipHistory)
      .where(and(eq(ownershipHistory.orgId, ctx.orgId), eq(ownershipHistory.propertyId, propertyId))),
    db.select({ count: count() }).from(inspections)
      .where(and(eq(inspections.orgId, ctx.orgId), eq(inspections.propertyId, propertyId))),
    db.select({ count: count() }).from(certifications)
      .where(and(eq(certifications.orgId, ctx.orgId), eq(certifications.propertyId, propertyId))),
    db.select({ count: count() }).from(safetyRisks)
      .where(and(eq(safetyRisks.orgId, ctx.orgId), eq(safetyRisks.propertyId, propertyId))),
    db.select({ count: count() }).from(emergencyContacts)
      .where(and(eq(emergencyContacts.orgId, ctx.orgId), eq(emergencyContacts.propertyId, propertyId))),
    db.select({ count: count() }).from(maintenanceItems)
      .where(and(eq(maintenanceItems.orgId, ctx.orgId), eq(maintenanceItems.propertyId, propertyId))),
    db.select({ count: count() }).from(documents)
      .where(and(eq(documents.orgId, ctx.orgId), eq(documents.propertyId, propertyId))),
    db.select({ count: count() }).from(pillarVerifications)
      .where(and(eq(pillarVerifications.orgId, ctx.orgId), eq(pillarVerifications.propertyId, propertyId))),
  ]);

  const leaseIds = leaseRows.map((r) => r.id);

  // Payments hang off leases, not directly on properties, so we need a second query once we
  // have the lease ids. Skip entirely if the property has no leases (saves a DB round-trip).
  let paymentCountNum = 0;
  if (leaseIds.length > 0) {
    const [result] = await db.select({ count: count() })
      .from(payments)
      .where(and(eq(payments.orgId, ctx.orgId), inArray(payments.leaseId, leaseIds)));
    paymentCountNum = Number(result?.count ?? 0);
  }

  // Helper to safely convert Drizzle's count() result (which comes back as a string) to a number.
  const n = (r: { count: number | string } | undefined) => Number(r?.count ?? 0);

  const otherFields = {
    tenants:           n(tenantCount),
    expenses:          n(expenseCount),
    landParcels:       n(landParcelCount),
    propertyValuations: n(valuationCount),
    coOwners:          n(coOwnerCount),
    ownershipRecords:  n(ownershipRecordCount),
    ownershipDocuments: n(ownershipDocCount),
    ownershipHistory:  n(ownershipHistoryCount),
    inspections:       n(inspectionCount),
    certifications:    n(certCount),
    safetyRisks:       n(riskCount),
    emergencyContacts: n(contactCount),
    maintenanceItems:  n(maintenanceCount),
    pillarVerifications: n(verificationCount),
  };

  const otherTotal = Object.values(otherFields).reduce((acc, v) => acc + v, 0);

  return {
    leases:    leaseIds.length,
    payments:  paymentCountNum,
    documents: n(documentCount),
    ...otherFields,
    otherTotal,
  };
}

// Change-request dispatcher (Pro-3.0 — generalized ops).
// Maps entityType → per-operation schema + service fn.
// proposedPatch is ALWAYS re-validated here before being applied.
import "server-only";
import { z } from "zod";

// Property
import { PropertyPatchSchema, NewPropertySchema } from "@/lib/data/types/property";
import { createProperty, updateProperty, deleteProperty } from "@/lib/services/properties";
import type { PropertyPatch } from "@/lib/data/types/property";

// Lease
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import { createLease, updateLease, deleteLease } from "@/lib/services/leases";
import type { LeasePatch } from "@/lib/data/types/lease";

// Tenant
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { createTenant, updateTenant, deleteTenant } from "@/lib/services/tenants";
import type { TenantPatch } from "@/lib/data/types/tenant";

// Payment
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import { createPayment, updatePayment, deletePayment } from "@/lib/services/payments";
import type { PaymentPatch } from "@/lib/data/types/payment";

// Certification
import { NewCertificationSchema, CertificationPatchSchema } from "@/lib/data/types/certification";
import { createCertification, updateCertification, deleteCertification } from "@/lib/services/certifications";
import type { NewCertification, CertificationPatch } from "@/lib/data/types/certification";

// Inspection
import { NewInspectionSchema, InspectionPatchSchema } from "@/lib/data/types/inspection";
import { createInspection, updateInspection, deleteInspection } from "@/lib/services/inspections";
import type { NewInspection, InspectionPatch } from "@/lib/data/types/inspection";

// Safety risk
import { NewSafetyRiskSchema, SafetyRiskPatchSchema } from "@/lib/data/types/safety-risk";
import { createSafetyRisk, updateSafetyRisk, deleteSafetyRisk } from "@/lib/services/safety-risks";
import type { NewSafetyRisk, SafetyRiskPatch } from "@/lib/data/types/safety-risk";

// Maintenance item (Work Orders)
import { NewMaintenanceItemSchema, MaintenanceItemPatchSchema } from "@/lib/data/types/maintenance-item";
import { createMaintenanceItem, updateMaintenanceItem, deleteMaintenanceItem } from "@/lib/services/maintenance-items";
import type { NewMaintenanceItem, MaintenanceItemPatch } from "@/lib/data/types/maintenance-item";

// ── Phase 3 entities (ownership, estate, docs, valuation, directory) ──
// These use the Parameters<typeof …> cast so they need no per-entity Patch/New type imports.
import { NewCoOwnerSchema, CoOwnerPatchSchema } from "@/lib/data/types/co-owner";
import { createCoOwner, updateCoOwner, deleteCoOwner } from "@/lib/services/co-owners";
import { NewOwnershipRecordSchema, OwnershipRecordPatchSchema } from "@/lib/data/types/ownership-record";
import { createOwnershipRecord, updateOwnershipRecord, deleteOwnershipRecord } from "@/lib/services/ownership-records";
import { NewOwnershipDocumentSchema, OwnershipDocumentPatchSchema } from "@/lib/data/types/ownership-document";
import { createOwnershipDocument, updateOwnershipDocument, deleteOwnershipDocument } from "@/lib/services/ownership-documents";
import { NewPropertyValuationSchema, PropertyValuationPatchSchema } from "@/lib/data/types/property-valuation";
import { createPropertyValuation, updatePropertyValuation, deletePropertyValuation } from "@/lib/services/property-valuations";
import { NewSuccessorSchema, SuccessorPatchSchema } from "@/lib/data/types/successor";
import { createSuccessor, updateSuccessor, deleteSuccessor } from "@/lib/services/successors";
import { NewEmergencyContactSchema, EmergencyContactPatchSchema } from "@/lib/data/types/emergency-contact";
import { createEmergencyContact, updateEmergencyContact, deleteEmergencyContact } from "@/lib/services/emergency-contacts";
import { NewDocumentSchema, DocumentPatchSchema } from "@/lib/data/types/document";
import { createDocument, updateDocument, deleteDocument } from "@/lib/services/documents";
import { NewFolderSchema, FolderPatchSchema } from "@/lib/data/types/folder";
import { createFolder, updateFolder, deleteFolder } from "@/lib/services/folders";
import { NewProfessionalSchema, ProfessionalPatchSchema } from "@/lib/data/types/professional";
import { createProfessional, updateProfessional, deleteProfessional } from "@/lib/services/professionals";

import type { Ctx } from "@/lib/services/_mapping";
import type { ChangeRequest } from "@/lib/services/change-request-types";

// ─── Registry entry shape ─────────────────────────────────────────────────────

type RegistryEntry<TNew, TPatch> = {
  // Used for "create" operations — full required fields.
  createSchema: z.ZodType<TNew>;
  // Used for "update" operations — partial fields.
  updateSchema: z.ZodType<TPatch>;
  // Service functions invoked under the OWNER's admin ctx.
  create: (ctx: Ctx, input: TNew) => Promise<unknown>;
  update: (ctx: Ctx, id: string, patch: TPatch) => Promise<unknown>;
  delete: (ctx: Ctx, id: string) => Promise<void>;
};

// ponytail: all create/update fns typed as unknown — re-validation via createSchema/updateSchema
// at apply-time guarantees correctness; the cast is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, RegistryEntry<any, any>> = {
  property: {
    createSchema: NewPropertySchema,
    updateSchema: PropertyPatchSchema,
    create: (ctx: Ctx, input: unknown) => createProperty(ctx, input as Parameters<typeof createProperty>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateProperty(ctx, id, patch as PropertyPatch),
    delete: (ctx: Ctx, id: string) => deleteProperty(ctx, id),
  },
  lease: {
    createSchema: NewLeaseSchema,
    updateSchema: LeasePatchSchema,
    create: (ctx: Ctx, input: unknown) => createLease(ctx, input as import("@/lib/data/types/lease").NewLease),
    update: (ctx: Ctx, id: string, patch: unknown) => updateLease(ctx, id, patch as LeasePatch),
    delete: (ctx: Ctx, id: string) => deleteLease(ctx, id),
  },
  tenant: {
    createSchema: NewTenantSchema,
    updateSchema: TenantPatchSchema,
    create: (ctx: Ctx, input: unknown) => createTenant(ctx, input as import("@/lib/data/types/tenant").NewTenant),
    update: (ctx: Ctx, id: string, patch: unknown) => updateTenant(ctx, id, patch as TenantPatch),
    delete: (ctx: Ctx, id: string) => deleteTenant(ctx, id),
  },
  payment: {
    createSchema: NewPaymentSchema,
    updateSchema: PaymentPatchSchema,
    create: (ctx: Ctx, input: unknown) => createPayment(ctx, input as import("@/lib/data/types/payment").NewPayment),
    update: (ctx: Ctx, id: string, patch: unknown) => updatePayment(ctx, id, patch as PaymentPatch),
    delete: (ctx: Ctx, id: string) => deletePayment(ctx, id),
  },
  certification: {
    createSchema: NewCertificationSchema,
    updateSchema: CertificationPatchSchema,
    create: (ctx: Ctx, input: unknown) => createCertification(ctx, input as NewCertification),
    update: (ctx: Ctx, id: string, patch: unknown) => updateCertification(ctx, id, patch as CertificationPatch),
    delete: (ctx: Ctx, id: string) => deleteCertification(ctx, id),
  },
  inspection: {
    createSchema: NewInspectionSchema,
    updateSchema: InspectionPatchSchema,
    create: (ctx: Ctx, input: unknown) => createInspection(ctx, input as NewInspection),
    update: (ctx: Ctx, id: string, patch: unknown) => updateInspection(ctx, id, patch as InspectionPatch),
    delete: (ctx: Ctx, id: string) => deleteInspection(ctx, id),
  },
  "safety-risk": {
    createSchema: NewSafetyRiskSchema,
    updateSchema: SafetyRiskPatchSchema,
    create: (ctx: Ctx, input: unknown) => createSafetyRisk(ctx, input as NewSafetyRisk),
    update: (ctx: Ctx, id: string, patch: unknown) => updateSafetyRisk(ctx, id, patch as SafetyRiskPatch),
    delete: (ctx: Ctx, id: string) => deleteSafetyRisk(ctx, id),
  },
  "maintenance-item": {
    createSchema: NewMaintenanceItemSchema,
    updateSchema: MaintenanceItemPatchSchema,
    create: (ctx: Ctx, input: unknown) => createMaintenanceItem(ctx, input as NewMaintenanceItem),
    update: (ctx: Ctx, id: string, patch: unknown) => updateMaintenanceItem(ctx, id, patch as MaintenanceItemPatch),
    delete: (ctx: Ctx, id: string) => deleteMaintenanceItem(ctx, id),
  },
  "co-owner": {
    createSchema: NewCoOwnerSchema,
    updateSchema: CoOwnerPatchSchema,
    create: (ctx: Ctx, input: unknown) => createCoOwner(ctx, input as Parameters<typeof createCoOwner>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateCoOwner(ctx, id, patch as Parameters<typeof updateCoOwner>[2]),
    delete: (ctx: Ctx, id: string) => deleteCoOwner(ctx, id),
  },
  "ownership-record": {
    createSchema: NewOwnershipRecordSchema,
    updateSchema: OwnershipRecordPatchSchema,
    create: (ctx: Ctx, input: unknown) => createOwnershipRecord(ctx, input as Parameters<typeof createOwnershipRecord>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateOwnershipRecord(ctx, id, patch as Parameters<typeof updateOwnershipRecord>[2]),
    delete: (ctx: Ctx, id: string) => deleteOwnershipRecord(ctx, id),
  },
  "ownership-document": {
    createSchema: NewOwnershipDocumentSchema,
    updateSchema: OwnershipDocumentPatchSchema,
    create: (ctx: Ctx, input: unknown) => createOwnershipDocument(ctx, input as Parameters<typeof createOwnershipDocument>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateOwnershipDocument(ctx, id, patch as Parameters<typeof updateOwnershipDocument>[2]),
    delete: (ctx: Ctx, id: string) => deleteOwnershipDocument(ctx, id),
  },
  "property-valuation": {
    createSchema: NewPropertyValuationSchema,
    updateSchema: PropertyValuationPatchSchema,
    create: (ctx: Ctx, input: unknown) => createPropertyValuation(ctx, input as Parameters<typeof createPropertyValuation>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updatePropertyValuation(ctx, id, patch as Parameters<typeof updatePropertyValuation>[2]),
    delete: (ctx: Ctx, id: string) => deletePropertyValuation(ctx, id),
  },
  successor: {
    createSchema: NewSuccessorSchema,
    updateSchema: SuccessorPatchSchema,
    create: (ctx: Ctx, input: unknown) => createSuccessor(ctx, input as Parameters<typeof createSuccessor>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateSuccessor(ctx, id, patch as Parameters<typeof updateSuccessor>[2]),
    delete: (ctx: Ctx, id: string) => deleteSuccessor(ctx, id),
  },
  "emergency-contact": {
    createSchema: NewEmergencyContactSchema,
    updateSchema: EmergencyContactPatchSchema,
    create: (ctx: Ctx, input: unknown) => createEmergencyContact(ctx, input as Parameters<typeof createEmergencyContact>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateEmergencyContact(ctx, id, patch as Parameters<typeof updateEmergencyContact>[2]),
    delete: (ctx: Ctx, id: string) => deleteEmergencyContact(ctx, id),
  },
  document: {
    createSchema: NewDocumentSchema,
    updateSchema: DocumentPatchSchema,
    create: (ctx: Ctx, input: unknown) => createDocument(ctx, input as Parameters<typeof createDocument>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateDocument(ctx, id, patch as Parameters<typeof updateDocument>[2]),
    // deleteDocument returns the removed row (for S3 cleanup); the registry delete is void.
    delete: async (ctx: Ctx, id: string) => { await deleteDocument(ctx, id); },
  },
  folder: {
    createSchema: NewFolderSchema,
    updateSchema: FolderPatchSchema,
    create: (ctx: Ctx, input: unknown) => createFolder(ctx, input as Parameters<typeof createFolder>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateFolder(ctx, id, patch as Parameters<typeof updateFolder>[2]),
    delete: (ctx: Ctx, id: string) => deleteFolder(ctx, id),
  },
  professional: {
    createSchema: NewProfessionalSchema,
    updateSchema: ProfessionalPatchSchema,
    create: (ctx: Ctx, input: unknown) => createProfessional(ctx, input as Parameters<typeof createProfessional>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateProfessional(ctx, id, patch as Parameters<typeof updateProfessional>[2]),
    delete: (ctx: Ctx, id: string) => deleteProfessional(ctx, id),
  },
};

// ─── Exported helpers ─────────────────────────────────────────────────────────

// Returns true if this entityType is registered (and therefore proposable).
export function isEntityRegistered(entityType: string): boolean {
  return entityType in REGISTRY;
}

// Returns the list of proposable entity type strings for UI surface gating.
export function registeredEntityTypes(): string[] {
  return Object.keys(REGISTRY);
}

// ─── Apply ────────────────────────────────────────────────────────────────────

// Applies the change request under the OWNER's admin ctx (passed by the service).
// Re-validates proposedPatch against the correct schema every time — never trusts stored JSONB.
// Stale deletes (row already removed) are swallowed so the inbox doesn't get stuck.
export async function applyChangeRequest(ctx: Ctx, cr: ChangeRequest): Promise<void> {
  const entry = REGISTRY[cr.entityType];
  if (!entry) {
    throw new Error(`No dispatcher registered for entity type: "${cr.entityType}"`);
  }

  if (cr.operation === "create") {
    // Full New* validation — all required fields must be present.
    const validated = entry.createSchema.parse(cr.proposedPatch);
    await entry.create(ctx, validated);
  } else if (cr.operation === "update") {
    if (!cr.entityId) {
      throw new Error(`Change request ${cr.id} has operation "update" but no entityId`);
    }
    // Partial patch validation.
    const validated = entry.updateSchema.parse(cr.proposedPatch);
    await entry.update(ctx, cr.entityId, validated);
  } else {
    // delete
    if (!cr.entityId) {
      throw new Error(`Change request ${cr.id} has operation "delete" but no entityId`);
    }
    try {
      await entry.delete(ctx, cr.entityId);
    } catch (err) {
      // Stale delete: row was already removed by the owner — treat as success.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found") || msg.includes("No rows") || msg.includes("forbidden")) {
        // "forbidden" is thrown by scopedDelete when orgId mismatches — means it's gone.
        // Re-throw forbidden; swallow not-found.
        if (!msg.includes("not found") && !msg.includes("No rows")) throw err;
        return;
      }
      throw err;
    }
  }
}

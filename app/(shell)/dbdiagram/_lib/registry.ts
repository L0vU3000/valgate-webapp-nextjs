import type { ZodType } from "zod";

import { CertificationSchema } from "@/lib/data/types/certification";
import { CoOwnerSchema } from "@/lib/data/types/co-owner";
import { DocumentSchema } from "@/lib/data/types/document";
import { EmergencyContactSchema } from "@/lib/data/types/emergency-contact";
import { EstateActivityEventSchema } from "@/lib/data/types/estate-activity-event";
import { ExpenseSchema } from "@/lib/data/types/expense";
import { FolderSchema } from "@/lib/data/types/folder";
import { InspectionSchema } from "@/lib/data/types/inspection";
import { LandParcelSchema } from "@/lib/data/types/land-parcel";
import { LeaseSchema } from "@/lib/data/types/lease";
import { MaintenanceItemSchema } from "@/lib/data/types/maintenance-item";
import { NotificationSchema } from "@/lib/data/types/notification";
import { NotificationPreferenceSchema } from "@/lib/data/types/notification-preference";
import { OwnershipDocumentSchema } from "@/lib/data/types/ownership-document";
import { OwnershipHistorySchema } from "@/lib/data/types/ownership-history";
import { OwnershipRecordSchema } from "@/lib/data/types/ownership-record";
import { PaymentSchema } from "@/lib/data/types/payment";
import { ProfessionalSchema } from "@/lib/data/types/professional";
import { PropertySchema } from "@/lib/data/types/property";
import { PropertyValuationSchema } from "@/lib/data/types/property-valuation";
import { SafetyRiskSchema } from "@/lib/data/types/safety-risk";
import { SuccessorSchema } from "@/lib/data/types/successor";
import { EstateAssignmentSchema } from "@/lib/data/types/successor-property-assignment";
import { TenantSchema } from "@/lib/data/types/tenant";
import { UserProfileSchema } from "@/lib/data/types/user-profile";

export type EntitySchema = ZodType;

export const SCHEMA_REGISTRY: Record<string, EntitySchema> = {
  certifications: CertificationSchema as unknown as EntitySchema,
  "co-owners": CoOwnerSchema as unknown as EntitySchema,
  documents: DocumentSchema as unknown as EntitySchema,
  "emergency-contacts": EmergencyContactSchema as unknown as EntitySchema,
  "estate-activity-events": EstateActivityEventSchema as unknown as EntitySchema,
  expenses: ExpenseSchema as unknown as EntitySchema,
  folders: FolderSchema as unknown as EntitySchema,
  inspections: InspectionSchema as unknown as EntitySchema,
  "land-parcels": LandParcelSchema as unknown as EntitySchema,
  leases: LeaseSchema as unknown as EntitySchema,
  "maintenance-items": MaintenanceItemSchema as unknown as EntitySchema,
  notifications: NotificationSchema as unknown as EntitySchema,
  "notification-preferences": NotificationPreferenceSchema as unknown as EntitySchema,
  "ownership-documents": OwnershipDocumentSchema as unknown as EntitySchema,
  "ownership-history": OwnershipHistorySchema as unknown as EntitySchema,
  "ownership-records": OwnershipRecordSchema as unknown as EntitySchema,
  payments: PaymentSchema as unknown as EntitySchema,
  professionals: ProfessionalSchema as unknown as EntitySchema,
  properties: PropertySchema as unknown as EntitySchema,
  "property-valuations": PropertyValuationSchema as unknown as EntitySchema,
  "safety-risks": SafetyRiskSchema as unknown as EntitySchema,
  successors: SuccessorSchema as unknown as EntitySchema,
  "estate-assignments":
    EstateAssignmentSchema as unknown as EntitySchema,
  tenants: TenantSchema as unknown as EntitySchema,
  "user-profiles": UserProfileSchema as unknown as EntitySchema,
};

export const REGISTRY_KEYS = Object.keys(SCHEMA_REGISTRY).sort();

export const STUB_ENTITIES: { name: string; note: string }[] = [
  { name: "users", note: "Clerk subjects (stub) — id PK only" },
];

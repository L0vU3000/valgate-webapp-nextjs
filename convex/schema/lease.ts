import { defineTable } from "convex/server";
import { v } from "convex/values";

// Renter profile (person or company) with envelope encryption and deterministic search hashes
export const party = defineTable({
  orgId: v.id("orgs"),
  type: v.union(v.literal("person"), v.literal("company")),
  // Safe display surrogate for UI (e.g., "Chan D." or "Acme Co.")
  displayNameSafe: v.optional(v.string()),
  avatarFileId: v.optional(v.id("_storage")),
  // Envelope encryption fields (optional during backfill rollout)
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  // Deterministic search hashes scoped per org for fast lookup
  displayNameHash: v.optional(v.string()),
  primaryEmailHash: v.optional(v.string()),
  primaryPhoneHash: v.optional(v.string()),
  taxIdHash: v.optional(v.string()),
  // Additional hashes replacing plaintext fields
  dateOfBirthHash: v.optional(v.string()),
  nationalityIdHash: v.optional(v.string()),
  addressLine1Hash: v.optional(v.string()),
  addressLine2Hash: v.optional(v.string()),
  cityHash: v.optional(v.string()),
  countryCodeHash: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_displayNameHash", ["orgId", "displayNameHash"])
  .index("by_org_primaryEmailHash", ["orgId", "primaryEmailHash"])
  .index("by_org_primaryPhoneHash", ["orgId", "primaryPhoneHash"])
  .index("by_org_taxIdHash", ["orgId", "taxIdHash"])
  .index("by_org_nationalityIdHash", ["orgId", "nationalityIdHash"])
  .index("by_org_createdAt", ["orgId", "createdAt"]);

// Core lease record tied to a single property
export const lease = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  status: v.union(
    v.literal("draft"),
    v.literal("active"),
    v.literal("expired"),
    v.literal("terminated")
  ),
  startDate: v.string(), // ISO date
  endDate: v.string(), // ISO date
  rentAmount: v.number(),
  rentFrequency: v.union(
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("yearly"),
  ),
  currency: v.string(), // e.g. USD, KHR
  depositAmount: v.optional(v.number()),
  billingDayOfMonth: v.optional(v.number()), // 1..28
  graceDays: v.optional(v.number()),
  agreementFileId: v.optional(v.id("_storage")),
  indexationPolicyJSON: v.optional(v.any()),
  lateFeePolicyJSON: v.optional(v.any()),
  otherMetadataJSON: v.optional(
    v.array(
      v.object({
        icon: v.optional(v.string()),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
      })
    )
  ),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_startDate", ["orgId", "startDate"])
  .index("by_org_endDate", ["orgId", "endDate"]);

// Party membership/role on a lease with lifecycle
export const lease_party = defineTable({
  orgId: v.id("orgs"),
  leaseId: v.id("lease"),
  partyId: v.id("party"),
  role: v.union(
    v.literal("tenant"),
    v.literal("co_tenant"),
    v.literal("guarantor")
  ),
  isPrimary: v.boolean(),
  since: v.string(), // ISO date
  until: v.optional(v.string()), // ISO date; null/undefined = current
  createdAt: v.string(),
})
  .index("by_org_lease_role_primary", ["orgId", "leaseId", "role", "isPrimary"])
  .index("by_org_party", ["orgId", "partyId"]);

// Payments and schedule (planned and posted)
export const lease_payment = defineTable({
  orgId: v.id("orgs"),
  leaseId: v.id("lease"),
  partyId: v.optional(v.id("party")), // who paid 
  kind: v.union(
    v.literal("scheduled"),
    v.literal("posted"),
    v.literal("reversal"),
    v.literal("adjustment"),
    v.literal("fee"),
  ),
  status: v.union(
    v.literal("open"),
    v.literal("settled"),
    v.literal("void"),
  ),
  period: v.string(), // e.g. 2025-06
  dueDate: v.optional(v.string()), // Reserved for future , for scheduled
  valueDate: v.optional(v.string()), // Reserved for future for posted
  paymentDate: v.optional(v.string()), // for posted
  amount: v.number(),
  currency: v.string(),
  method: v.union(
    v.literal("aba"),
    v.literal("cash"),
    v.literal("bank"),
    v.literal("wallet"),
    v.literal("other"),
  ),
  methodRef: v.optional(v.string()),
  linkedPaymentId: v.optional(v.id("lease_payment")), // tie reversal/adjustment to posted
  evidenceFileId: v.optional(v.id("document")),
  notes: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_lease_kind_period", ["orgId", "leaseId", "kind", "period"])
  .index("by_org_lease_kind_status", ["orgId", "leaseId", "kind", "status"])
  .index("by_org_lease_valueDate", ["orgId", "leaseId", "valueDate"]);

// Documents associated with a lease
export const lease_document = defineTable({
  orgId: v.id("orgs"),
  leaseId: v.id("lease"),
  propertyDocumentId: v.id("document"), // stored reference
  category: v.union(
    v.literal("lease_agreement"),
    v.literal("tenant_id"),
    v.literal("guarantor_id"),
    v.literal("rent_tax_receipt"),
    v.literal("payment_receipt"),
    v.literal("inspection_report"),
    v.literal("other"),
  ),
  partyId: v.optional(v.id("party")),
  period: v.optional(v.string()), // e.g. 2025-06 for monthly receipts
  issuedDate: v.optional(v.string()),
  expiryDate: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("by_org_lease_category", ["orgId", "leaseId", "category"])
  .index("by_org_lease_party", ["orgId", "leaseId", "partyId"])
  .index("by_org_lease_period", ["orgId", "leaseId", "period"]);



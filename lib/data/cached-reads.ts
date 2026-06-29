import "server-only";
import { unstable_cache } from "next/cache";
import { redis } from "@/lib/cache/redis";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { listExpenses } from "@/lib/services/expenses";
import { listDocuments } from "@/lib/services/documents";
import { listFolders } from "@/lib/services/folders";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listInspections } from "@/lib/services/inspections";
import { listCertifications } from "@/lib/services/certifications";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listNotifications } from "@/lib/services/notifications";
import { getUserProfile } from "@/lib/services/user-profiles";
import type { Ctx } from "@/lib/services/_mapping";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import type { Expense } from "@/lib/data/types/expense";
import type { Document } from "@/lib/data/types/document";
import type { Folder } from "@/lib/data/types/folder";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Certification } from "@/lib/data/types/certification";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { Notification } from "@/lib/data/types/notification";
import type { UserProfile } from "@/lib/data/types/user-profile";

function propertyKey(propertyId?: string): string {
  return propertyId ?? "__all__";
}

// Read-through cache helper backed by Upstash Redis.
//
// Checks Upstash for a cached result first. On a miss it runs the provided query
// function (a raw service call — not unstable_cache), stores the result in Upstash
// with a 1h safety-net TTL, and registers the Redis key in a per-tag tracking set
// so bustCache can find and delete it on the next mutation.
//
// The cache key format is: read:<tag>:<orgId>:<propertyId|__all__>
// This matches the tenant-scoped tagging strategy used by Phase 3 (unstable_cache).
//
// When redis is null (env vars unset), falls through to the raw query with no caching.
// This means entities moved to readThrough lose their unstable_cache layer in dev —
// that is intentional; Upstash is the single cache of record for these entities.
//
// What can go wrong: if the Upstash get/set fails the error is caught and the query
// runs against Neon directly so the UI still loads. A set failure means the next read
// is also a miss (no stale data risk, just extra Neon load until the key is written).
async function readThrough<T>(
  tag: string,
  orgId: string,
  propertyId: string | undefined,
  query: () => Promise<T>,
): Promise<T> {
  if (!redis) {
    // No Upstash configured — go straight to the database.
    return query();
  }

  const key = `read:${tag}:${orgId}:${propertyId ?? "__all__"}`;

  try {
    // Attempt to read from Upstash. Redis.get returns null on a cache miss.
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
  } catch (err) {
    // Upstash unreachable — log and fall through to the database.
    console.error(`readThrough("${key}") get failed, falling back to DB:`, err);
    return query();
  }

  // Cache miss — fetch fresh data from the database.
  const fresh = await query();

  try {
    // Store the result with a 1h TTL. If we never get a bust, data self-heals.
    await redis.set(key, fresh, { ex: 3600 });
    // Register this key in the tag's tracking set so bustCache can delete it later.
    await redis.sadd(`tagkeys:${tag}`, key);
  } catch (err) {
    // Failed to write to Upstash — log but return the fresh data we already have.
    // The next request will be another miss and retry the write.
    console.error(`readThrough("${key}") set failed — caching skipped this request:`, err);
  }

  return fresh;
}

// Tag: leases
// Uses readThrough (Upstash) instead of unstable_cache for this entity.
// Upstash is the single cache of record — do not double-wrap with unstable_cache.
// The paired bust call is in app/actions/leases.ts beside every revalidateFeTag("leases").
export function cachedListLeases(ctx: Ctx, propertyId?: string): Promise<Lease[]> {
  return readThrough("leases", ctx.orgId, propertyId, () => listLeases(ctx, propertyId));
}

// Tag: tenants
// Uses readThrough (Upstash) instead of unstable_cache for this entity.
// Upstash is the single cache of record — do not double-wrap with unstable_cache.
// The paired bust call is in app/actions/tenants.ts beside every revalidateFeTag("tenants").
export function cachedListTenants(ctx: Ctx, propertyId?: string): Promise<Tenant[]> {
  return readThrough("tenants", ctx.orgId, propertyId, () => listTenants(ctx, propertyId));
}

// Tag: payments
// Uses readThrough (Upstash) instead of unstable_cache for this entity.
// Upstash is the single cache of record — do not double-wrap with unstable_cache.
// The paired bust call is in app/actions/payments.ts beside every revalidateFeTag("payments").
export function cachedListPayments(ctx: Ctx, propertyId?: string): Promise<Payment[]> {
  return readThrough("payments", ctx.orgId, propertyId, () => listPayments(ctx, propertyId));
}

// Tag: expenses
// Uses readThrough (Upstash) instead of unstable_cache for this entity.
// Upstash is the single cache of record — do not double-wrap with unstable_cache.
// The cache self-heals at 1h TTL — no mutation action exists for this entity.
export function cachedListExpenses(ctx: Ctx, propertyId?: string): Promise<Expense[]> {
  return readThrough("expenses", ctx.orgId, propertyId, () => listExpenses(ctx, propertyId));
}

// Tag: documents
// Uses readThrough (Upstash) instead of unstable_cache for this entity.
// Upstash is the single cache of record — do not double-wrap with unstable_cache.
// The paired bust call is in app/actions/documents.ts beside every revalidateFeTag("documents").
// Also busted in app/actions/folders.ts when a folder deletion moves documents to root.
export function cachedListDocuments(ctx: Ctx, propertyId?: string): Promise<Document[]> {
  return readThrough("documents", ctx.orgId, propertyId, () => listDocuments(ctx, propertyId));
}

// Tag: folders
// Uses readThrough (Upstash) instead of unstable_cache for this entity.
// Upstash is the single cache of record — do not double-wrap with unstable_cache.
// The paired bust call is in app/actions/folders.ts beside every revalidateFeTag("folders").
export function cachedListFolders(ctx: Ctx, propertyId?: string): Promise<Folder[]> {
  return readThrough("folders", ctx.orgId, propertyId, () => listFolders(ctx, propertyId));
}

// Tag: maintenance-items
export function cachedListMaintenanceItems(
  ctx: Ctx,
  propertyId?: string,
): Promise<MaintenanceItem[]> {
  return unstable_cache(
    async () => listMaintenanceItems(ctx, propertyId),
    ["maintenance-items", ctx.orgId, propertyKey(propertyId)],
    { tags: ["maintenance-items"] },
  )();
}

// Tag: property-valuations
export function cachedListPropertyValuations(
  ctx: Ctx,
  propertyId?: string,
): Promise<PropertyValuation[]> {
  return unstable_cache(
    async () => listPropertyValuations(ctx, propertyId),
    ["property-valuations", ctx.orgId, propertyKey(propertyId)],
    { tags: ["property-valuations"] },
  )();
}

// Tag: ownership-records
export function cachedListOwnershipRecords(
  ctx: Ctx,
  propertyId?: string,
): Promise<OwnershipRecord[]> {
  return unstable_cache(
    async () => listOwnershipRecords(ctx, propertyId),
    ["ownership-records", ctx.orgId, propertyKey(propertyId)],
    { tags: ["ownership-records"] },
  )();
}

// Tag: co-owners
export function cachedListCoOwners(ctx: Ctx, propertyId?: string): Promise<CoOwner[]> {
  return unstable_cache(
    async () => listCoOwners(ctx, propertyId),
    ["co-owners", ctx.orgId, propertyKey(propertyId)],
    { tags: ["co-owners"] },
  )();
}

// Tag: ownership-documents
export function cachedListOwnershipDocuments(
  ctx: Ctx,
  propertyId?: string,
): Promise<OwnershipDocument[]> {
  return unstable_cache(
    async () => listOwnershipDocuments(ctx, propertyId),
    ["ownership-documents", ctx.orgId, propertyKey(propertyId)],
    { tags: ["ownership-documents"] },
  )();
}

// Tag: safety-risks
export function cachedListSafetyRisks(ctx: Ctx, propertyId?: string): Promise<SafetyRisk[]> {
  return unstable_cache(
    async () => listSafetyRisks(ctx, propertyId),
    ["safety-risks", ctx.orgId, propertyKey(propertyId)],
    { tags: ["safety-risks"] },
  )();
}

// Tag: inspections
export function cachedListInspections(ctx: Ctx, propertyId?: string): Promise<Inspection[]> {
  return unstable_cache(
    async () => listInspections(ctx, propertyId),
    ["inspections", ctx.orgId, propertyKey(propertyId)],
    { tags: ["inspections"] },
  )();
}

// Tag: certifications
export function cachedListCertifications(
  ctx: Ctx,
  propertyId?: string,
): Promise<Certification[]> {
  return unstable_cache(
    async () => listCertifications(ctx, propertyId),
    ["certifications", ctx.orgId, propertyKey(propertyId)],
    { tags: ["certifications"] },
  )();
}

// Tag: emergency-contacts
export function cachedListEmergencyContacts(
  ctx: Ctx,
  propertyId?: string,
): Promise<EmergencyContact[]> {
  return unstable_cache(
    async () => listEmergencyContacts(ctx, propertyId),
    ["emergency-contacts", ctx.orgId, propertyKey(propertyId)],
    { tags: ["emergency-contacts"] },
  )();
}

// Tag: estate-assignments
export function cachedListEstateAssignments(
  ctx: Ctx,
  propertyId?: string,
): Promise<EstateAssignment[]> {
  return unstable_cache(
    async () => listEstateAssignments(ctx, propertyId),
    ["estate-assignments", ctx.orgId, propertyKey(propertyId)],
    { tags: ["estate-assignments"] },
  )();
}

// Tag: notifications
export function cachedListNotifications(ctx: Ctx, propertyId?: string): Promise<Notification[]> {
  return unstable_cache(
    async () => listNotifications(ctx, propertyId),
    ["notifications", ctx.orgId, propertyKey(propertyId)],
    { tags: ["notifications"] },
  )();
}

// Tag: user-profiles
export function cachedGetUserProfile(ctx: Ctx, id: string): Promise<UserProfile | null> {
  return unstable_cache(
    async () => getUserProfile(ctx, id),
    ["user-profiles", ctx.orgId, id],
    { tags: ["user-profiles"] },
  )();
}

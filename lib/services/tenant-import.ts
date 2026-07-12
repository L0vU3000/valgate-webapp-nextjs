import "server-only";
import { listProperties } from "@/lib/services/properties";
import { createTenant } from "@/lib/services/tenants";
import { NewTenantSchema, type TenantStatus, type NewTenant } from "@/lib/data/types/tenant";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import type { Ctx } from "@/lib/services/_mapping";
import { log } from "@/lib/log";
import {
  planFieldSources,
  assembleRows,
  type SheetData,
  type FieldSpec,
  type AssembledRow,
} from "@/lib/services/entity-import";
// Property linkage is shared across importers; re-exported below so existing importers of
// tenant-import keep resolving properties through the same names.
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";

export { resolveProperty, type PropertyMatch };

// ─────────────────────────────────────────────────────────────────────────────
// Tenant import — the thin, tenant-specific layer over the generic field-first
// engine (entity-import.ts). It supplies:
//   1. the tenant field list the AI sources from the workbook,
//   2. value normalizers (rent → number, status → Valgate enum),
//   3. property linkage (a workbook property label/ID → a real Valgate property),
//   4. per-row bulk create with partial success.
// Every other entity (leases, valuations, …) will mirror this file against the
// same engine with its own field list.
// ─────────────────────────────────────────────────────────────────────────────

// The Valgate tenant is small and FUSED; the workbook spreads the same data over
// several sheets. We source these fields FIRST, wherever they live:
//   - name/email/phone typically live in a tenant-profile sheet,
//   - unit/rent/status/property typically live in a lease sheet, joined by tenant ID.
// "property" here is the raw label/ID as it appears in the sheet; we resolve it to
// a real Valgate propertyId in resolveProperty() below.
export const TENANT_FIELDS: FieldSpec[] = [
  { field: "name", required: true, description: "The tenant's full name or company name." },
  { field: "unit", required: true, description: "The unit or property label the tenant occupies — often the property name/label on their lease." },
  { field: "rent", required: true, description: "The monthly rent the tenant pays, as a number (e.g. from a 'Monthly Rent' column)." },
  { field: "status", required: true, description: "Whether the tenant's rent is Paid, Overdue, or Pending — derive from a lease/payment status column." },
  { field: "email", required: false, description: "The tenant's email address." },
  { field: "phone", required: false, description: "The tenant's primary phone number." },
  { field: "property", required: true, description: "The property the tenant is linked to — its label, name, or ID as it appears on the lease." },
];

// One reviewed tenant, ready for the review table and (after edits) for creation.
export type TenantCandidate = {
  name: string;
  unit: string;
  rent: number;
  status: TenantStatus;
  email: string;
  phone: string;
  // The property value as sourced from the sheet (shown in review so the user can
  // see what we matched against).
  rawProperty: string;
  // The resolved Valgate property id, or "" when we could not auto-match it — the
  // review table then shows a property picker for that row.
  propertyId: string;
  // Blocking or heads-up problems for this row (missing name, unmatched property…).
  issues: string[];
};

// A property the user can pick from in the review table (id + human label).
export type PropertyOption = { id: string; label: string };

export type MapTenantsResult = {
  primarySheet: string | null;
  candidates: TenantCandidate[];
  // Every property in the caller's org, for the review-table picker.
  properties: PropertyOption[];
};

// Turn free-text rent ("$1,200", "1200 USD") into a non-negative number. Anything
// unparseable becomes 0 (flagged as missing upstream if required).
export function parseRent(raw: string): number {
  // A minus sign means a negative/credit figure — not a valid rent. Reject it BEFORE stripping,
  // since stripping non-digits would silently turn "-50" into a positive 50.
  if (/-/.test(raw)) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value) || value < 0) return 0;
  return value;
}

// Coerce a free-text lease/payment status into Valgate's tenant enum. Default is
// "Pending" — the safe, non-alarming state when the source is blank or unclear.
//
// Order and negation matter: a delinquent status must NEVER read as Paid. We test
// the overdue/unpaid tokens first (including negated forms like "not paid"), and
// only accept "Paid" when it is affirmative and not negated. Anything ambiguous
// ("current", "balance due", …) falls through to Pending rather than Paid.
export function normalizeTenantStatus(raw: string): TenantStatus {
  const v = raw.toLowerCase().trim();
  if (/overdue|arrears|default|\blate\b/.test(v)) return "Overdue";
  if (/unpaid|not paid|non-?payment|outstanding|owing|in debt/.test(v)) return "Overdue";
  if (/\bpaid\b|settled/.test(v) && !/not|un|partial|pending/.test(v)) return "Paid";
  return "Pending";
}

// Build the reviewable candidate from one assembled row. PURE (no DB): property
// linkage is applied separately in resolveProperty so this stays unit-testable.
export function toTenantCandidate(assembled: AssembledRow): TenantCandidate {
  const v = assembled.values;
  const issues: string[] = [];
  if (!v.name) issues.push("Missing name");
  if (!v.property) issues.push("No property on the sheet");

  return {
    name: v.name ?? "",
    unit: v.unit ?? "",
    rent: parseRent(v.rent ?? ""),
    status: normalizeTenantStatus(v.status ?? ""),
    email: v.email ?? "",
    phone: v.phone ?? "",
    rawProperty: v.property ?? "",
    propertyId: "",
    issues,
  };
}

// Full pipeline for the map step: AI sources the tenant fields across the whole
// workbook, we assemble + normalize rows, auto-match each to a property, and load
// the org's property list for the review picker. Auth is enforced by the caller
// (the server action passes an authenticated ctx).
export async function mapTenants(ctx: Ctx, sheets: SheetData[]): Promise<MapTenantsResult> {
  const properties = await listProperties(ctx);
  const options: PropertyOption[] = properties.map((p) => ({ id: p.id, label: p.name }));
  const matches: PropertyMatch[] = properties.map((p) => ({ id: p.id, name: p.name, code: p.code, title: p.title }));

  const plan = await planFieldSources(sheets, TENANT_FIELDS, "tenant");
  if (!plan) {
    // AI unavailable → nothing to review. The UI surfaces this as a soft failure.
    return { primarySheet: null, candidates: [], properties: options };
  }

  const assembled = assembleRows(sheets, plan, TENANT_FIELDS);
  const candidates = assembled.map((row) => {
    const candidate = toTenantCandidate(row);
    candidate.propertyId = resolveProperty(candidate.rawProperty, matches);
    if (!candidate.propertyId && candidate.rawProperty) {
      candidate.issues.push("No matching property — pick one");
    }
    return candidate;
  });

  return { primarySheet: plan.primarySheet, candidates, properties: options };
}

// What the review table sends back to create: the reviewed values plus the chosen
// property id (the user may have picked it manually for unmatched rows).
export type TenantDraft = {
  name: string;
  unit: string;
  rent: number;
  status: TenantStatus;
  email: string;
  phone: string;
  propertyId: string;
};

export type BulkCreateTenantsResult = {
  created: number;
  failures: { row: number; name: string; reason: string }[];
};

// Create one tenant per reviewed draft, scoped to the caller's org via ctx
// (createTenant → scopedInsert writes to ctx.orgId only). Per-row + partial
// success: one bad row never rolls back the others. Every draft is validated by
// NewTenantSchema before insert, so a missing property or name fails that row
// cleanly instead of corrupting data.
export async function bulkCreateTenants(ctx: Ctx, drafts: TenantDraft[]): Promise<BulkCreateTenantsResult> {
  const candidates = drafts.map((draft, i) => {
    let entity: NewTenant;
    try {
      entity = NewTenantSchema.parse({
        propertyId: draft.propertyId,
        name: draft.name,
        unit: draft.unit || "—",
        rent: draft.rent,
        status: draft.status,
        email: draft.email || undefined,
        phone: draft.phone || undefined,
      });
    } catch (err) {
      log.warn("tenant-import row validation failed", { row: i, err: String(err) });
      entity = {
        propertyId: draft.propertyId,
        name: draft.name,
        unit: draft.unit || "—",
        rent: draft.rent,
        status: draft.status,
      };
    }
    return {
      id: crypto.randomUUID(),
      entity,
      source: { type: "spreadsheet" as const, row: i + 1 },
      issues: [],
      confidence: "high" as const,
    };
  });

  return persistCandidates(ctx, candidates, createTenant, {
    entityName: (e) => e.name || "Untitled",
  });
}

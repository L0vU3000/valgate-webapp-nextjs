import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { listProperties } from "@/lib/services/properties";
import {
  sanitizePlan,
  assembleRows,
  type FieldSpec,
  type AssembledRow,
  type SheetData,
  type RawPlan,
} from "@/lib/services/entity-import";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { findHeaderRow, extractRows } from "@/app/_shared/add-property/_lib/extract-rows";
import type { SheetMatrix } from "@/app/_shared/add-property/_lib/parse-spreadsheet";
import { normalizeType, normalizeStatus, bulkCreateProperties } from "@/lib/services/property-import";
import { parseRent, normalizeTenantStatus, bulkCreateTenants } from "@/lib/services/tenant-import";
import {
  parseMonth, parsePrice, parseTimestamp,
  bulkCreateValuations,
} from "@/lib/services/valuation-import";
import {
  defaultForm as defaultWizardForm, type FormData as WizardForm, type WizardStatus,
} from "@/app/_shared/add-property/types";
import type { Ctx } from "@/lib/services/_mapping";
import type {
  EntityType, PerEntityRows, ReviewRow, BulkResult,
} from "@/lib/services/ingestion/types";
import type { TenantStatus } from "@/lib/data/types/tenant";

// ─── Zod schema ──────────────────────────────────────────────────────

// One field→column mapping. `field` names which Valgate field this maps.
//
// NOTE: `sources` is an ARRAY, not a `z.record()`/map. OpenAI's strict
// structured-output mode (which generateObject uses for gpt-4o-mini) rejects
// open-ended objects — a record compiles to JSON-schema `additionalProperties`/
// `propertyNames`, which the API refuses ("'propertyNames' is not permitted"),
// so the whole call throws. An array of {field, sheet, column} is strict-safe.
const fieldSourceSchema = z.object({
  field: z.string(),
  sheet: z.string().nullable(),
  column: z.string().nullable(),
});

const entityPlanSchema = z.object({
  primarySheet: z.string(),
  // Required (no .default) — strict mode needs every property present; the
  // model returns [] when there are no cross-sheet joins.
  joins: z.array(z.object({
    sheet: z.string(),
    joinColumn: z.string(),
    primaryColumn: z.string(),
  })),
  sources: z.array(fieldSourceSchema),
}).nullable();

export const unifiedPlanSchema = z.object({
  properties: entityPlanSchema,
  tenants: entityPlanSchema,
  valuations: entityPlanSchema,
  leases: entityPlanSchema,
  payments: entityPlanSchema,
  expenses: entityPlanSchema,
  coOwners: entityPlanSchema,
  maintenance: entityPlanSchema,
  inspections: entityPlanSchema,
  certifications: entityPlanSchema,
  safetyRisks: entityPlanSchema,
  emergencyContacts: entityPlanSchema,
  successors: entityPlanSchema,
  landParcels: entityPlanSchema,
});

export type UnifiedPlan = z.infer<typeof unifiedPlanSchema>;

// ─── Field specs ─────────────────────────────────────────────────────

const PROPERTY_FIELDS: FieldSpec[] = [
  { field: "propertyName", required: true, description: "A human name/label or street address identifying the property. NOT a 'Property Type'/'Category' column." },
  { field: "propertyType", required: true, description: "The category: residential, commercial, multi-unit, retail, land, industrial, construction, or other." },
  { field: "status", required: false, description: "Occupancy: Rented, Vacant, or Owner-Occupied." },
  { field: "addressLine", required: false, description: "Street address / first address line." },
  { field: "addressLine2", required: false, description: "Second address line (apartment, suite, etc.)." },
  { field: "city", required: false, description: "Town or municipality." },
  { field: "province", required: false, description: "Province / state / region." },
  { field: "zip", required: false, description: "Postal / ZIP code." },
  { field: "country", required: false, description: "Country." },
  { field: "yearBuilt", required: false, description: "Year the property was built." },
  { field: "totalArea", required: false, description: "Total area as a number (square meters)." },
  { field: "bedrooms", required: false, description: "Number of bedrooms." },
  { field: "bathrooms", required: false, description: "Number of bathrooms." },
  { field: "parkingSpaces", required: false, description: "Number of parking spaces." },
  { field: "storageUnit", required: false, description: "Storage unit label." },
  { field: "purchasePrice", required: false, description: "Purchase / sale price." },
  { field: "purchaseDate", required: false, description: "Purchase date." },
  { field: "currentMarketValue", required: false, description: "Current market value." },
  { field: "outstandingMortgage", required: false, description: "Outstanding mortgage amount." },
  { field: "monthlyPayment", required: false, description: "Monthly mortgage payment." },
  { field: "interestRate", required: false, description: "Interest rate percentage." },
  { field: "annualPropertyTax", required: false, description: "Annual property tax." },
  { field: "taxAssessmentValue", required: false, description: "Tax assessment value." },
  { field: "annualInsurance", required: false, description: "Annual insurance premium." },
  { field: "ownershipStatus", required: false, description: "Ownership arrangement (owned, leased, etc.)." },
];

// ─── Entity handler registry ────────────────────────────────────────

type EntityHandler = {
  fieldSpecs: FieldSpec[];
  toReviewRow: (assembled: AssembledRow, matches: PropertyMatch[]) => ReviewRow;
  bulkCreate: (ctx: Ctx, rows: ReviewRow[]) => Promise<BulkResult>;
  hasProperty: boolean;
};

// Property handler
function toPropertyReviewRow(a: AssembledRow, _m: PropertyMatch[]): ReviewRow {
  const v = a.values;
  const issues: string[] = [];
  if (!v.propertyName) issues.push("Missing name");
  if (!v.propertyType) issues.push("Missing type");
  const address = [v.addressLine, v.city, v.province, v.country].filter(Boolean).join(", ");
  return {
    values: {
      propertyName: v.propertyName ?? "",
      propertyType: normalizeType(v.propertyType ?? ""),
      status: normalizeStatus(v.status ?? ""),
      addressLine: v.addressLine ?? "",
      city: v.city ?? "",
      province: v.province ?? "",
      zip: v.zip ?? "",
      country: v.country ?? "",
      yearBuilt: v.yearBuilt ?? "",
      totalArea: v.totalArea ?? "",
      bedrooms: v.bedrooms ?? "",
      bathrooms: v.bathrooms ?? "",
      parkingSpaces: v.parkingSpaces ?? "",
      storageUnit: v.storageUnit ?? "",
      purchasePrice: v.purchasePrice ?? "",
      purchaseDate: v.purchaseDate ?? "",
      currentMarketValue: v.currentMarketValue ?? "",
      outstandingMortgage: v.outstandingMortgage ?? "",
      monthlyPayment: v.monthlyPayment ?? "",
      interestRate: v.interestRate ?? "",
      annualPropertyTax: v.annualPropertyTax ?? "",
      taxAssessmentValue: v.taxAssessmentValue ?? "",
      annualInsurance: v.annualInsurance ?? "",
      ownershipStatus: v.ownershipStatus ?? "",
      needsLocation: !address ? "true" : "false",
    },
    issues,
  };
}

async function bulkCreatePropertiesFromRows(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const forms: WizardForm[] = rows.map((r) => ({
    ...defaultWizardForm,
    method: "manual" as const,
    propertyName: r.values.propertyName ?? "",
    propertyType: r.values.propertyType ?? "",
    status: (r.values.status ?? "") as WizardStatus,
    addressLine: r.values.addressLine ?? "",
    city: r.values.city ?? "",
    province: r.values.province ?? "",
    zip: r.values.zip ?? "",
    country: r.values.country ?? "",
    yearBuilt: r.values.yearBuilt ?? "",
    totalArea: r.values.totalArea ?? "",
    bedrooms: r.values.bedrooms ?? "",
    bathrooms: r.values.bathrooms ?? "",
    parkingSpaces: r.values.parkingSpaces ?? "",
    storageUnit: r.values.storageUnit ?? "",
    purchasePrice: r.values.purchasePrice ?? "",
    purchaseDate: r.values.purchaseDate ?? "",
    currentMarketValue: r.values.currentMarketValue ?? "",
    outstandingMortgage: r.values.outstandingMortgage ?? "",
    monthlyPayment: r.values.monthlyPayment ?? "",
    interestRate: r.values.interestRate ?? "",
    annualPropertyTax: r.values.annualPropertyTax ?? "",
    taxAssessmentValue: r.values.taxAssessmentValue ?? "",
    annualInsurance: r.values.annualInsurance ?? "",
    ownershipStatus: r.values.ownershipStatus ?? "",
  }));
  return bulkCreateProperties(ctx, forms);
}

// Tenant handler
const TENANT_FIELDS: FieldSpec[] = [
  { field: "name", required: true, description: "Tenant's full name or company name." },
  { field: "unit", required: true, description: "Unit or property label the tenant occupies." },
  { field: "rent", required: true, description: "Monthly rent as a number." },
  { field: "status", required: true, description: "Rent status: Paid, Overdue, or Pending." },
  { field: "email", required: false, description: "Email address." },
  { field: "phone", required: false, description: "Phone number." },
  { field: "property", required: true, description: "Property label, name, or ID the tenant is linked to." },
];

function toTenantReviewRow(a: AssembledRow, m: PropertyMatch[]): ReviewRow {
  const v = a.values;
  const issues: string[] = [];
  if (!v.name) issues.push("Missing name");
  if (!v.property) issues.push("No property on the sheet");
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, m);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      name: v.name ?? "",
      propertyId,
      unit: v.unit ?? "",
      rent: v.rent ? String(parseRent(v.rent)) : "",
      status: normalizeTenantStatus(v.status ?? ""),
      email: v.email ?? "",
      phone: v.phone ?? "",
    },
    rawProperty,
    issues,
  };
}

async function bulkCreateTenantsFromRows(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const drafts = rows.map((r) => ({
    name: (r.values.name ?? "").trim(),
    unit: (r.values.unit ?? "").trim(),
    rent: parseRent(r.values.rent ?? ""),
    status: (r.values.status ?? "Pending") as TenantStatus,
    propertyId: r.values.propertyId ?? "",
    email: (r.values.email ?? "").trim(),
    phone: (r.values.phone ?? "").trim(),
  }));
  return bulkCreateTenants(ctx, drafts);
}

// Valuation handler
const VALUATION_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "Property reference (ID, name, or label)." },
  { field: "price", required: true, description: "Market value figure." },
  { field: "valuationDate", required: true, description: "Date the valuation was recorded." },
];

function toValuationReviewRow(a: AssembledRow, m: PropertyMatch[]): ReviewRow {
  const v = a.values;
  const issues: string[] = [];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, m);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  const month = parseMonth(v.valuationDate ?? "");
  const price = parsePrice(v.price ?? "");
  if (price <= 0) issues.push("No valid price");
  if (!month) issues.push("No valid valuation date");
  return {
    values: {
      propertyId,
      month,
      price: price > 0 ? String(price) : "",
    },
    rawProperty,
    issues,
  };
}

async function bulkCreateValuationsFromRows(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const drafts = rows.map((r) => ({
    propertyId: r.values.propertyId ?? "",
    month: (r.values.month ?? "").trim(),
    price: parsePrice(r.values.price ?? ""),
    recordedAt: parseTimestamp(r.values.month ?? ""),
  }));
  const result = await bulkCreateValuations(ctx, drafts);
  return { created: result.created, failures: result.failures.map((f) => ({ row: f.row, name: f.label, reason: f.reason })) };
}

// Import the toReviewRow + bulkCreate from the 11 new entity service files
import { LEASE_FIELDS, toLeaseReviewRow, bulkCreateLeases } from "@/lib/services/lease-import";
import { PAYMENT_FIELDS, toPaymentReviewRow, bulkCreatePayments } from "@/lib/services/payment-import";
import { EXPENSE_FIELDS, toExpenseReviewRow, bulkCreateExpenses } from "@/lib/services/expense-import";
import { CO_OWNER_FIELDS, toCoOwnerReviewRow, bulkCreateCoOwners } from "@/lib/services/co-owner-import";
import { MAINTENANCE_FIELDS, toMaintenanceReviewRow, bulkCreateMaintenance } from "@/lib/services/maintenance-import";
import { INSPECTION_FIELDS, toInspectionReviewRow, bulkCreateInspections } from "@/lib/services/inspection-import";
import { CERTIFICATION_FIELDS, toCertificationReviewRow, bulkCreateCertifications } from "@/lib/services/certification-import";
import { SAFETY_RISK_FIELDS, toSafetyRiskReviewRow, bulkCreateSafetyRisks } from "@/lib/services/safety-risk-import";
import { EMERGENCY_CONTACT_FIELDS, toEmergencyContactReviewRow, bulkCreateEmergencyContacts } from "@/lib/services/emergency-contact-import";
import { SUCCESSOR_FIELDS, toSuccessorReviewRow, bulkCreateSuccessors } from "@/lib/services/successor-import";
import { LAND_PARCEL_FIELDS, toLandParcelReviewRow, bulkCreateLandParcels } from "@/lib/services/land-parcel-import";

export const entityHandlers: Record<EntityType, EntityHandler> = {
  properties: { fieldSpecs: PROPERTY_FIELDS, toReviewRow: toPropertyReviewRow, bulkCreate: bulkCreatePropertiesFromRows, hasProperty: false },
  tenants: { fieldSpecs: TENANT_FIELDS, toReviewRow: toTenantReviewRow, bulkCreate: bulkCreateTenantsFromRows, hasProperty: true },
  valuations: { fieldSpecs: VALUATION_FIELDS, toReviewRow: toValuationReviewRow, bulkCreate: bulkCreateValuationsFromRows, hasProperty: true },
  leases: { fieldSpecs: LEASE_FIELDS, toReviewRow: toLeaseReviewRow, bulkCreate: bulkCreateLeases, hasProperty: true },
  payments: { fieldSpecs: PAYMENT_FIELDS, toReviewRow: toPaymentReviewRow, bulkCreate: bulkCreatePayments, hasProperty: true },
  expenses: { fieldSpecs: EXPENSE_FIELDS, toReviewRow: toExpenseReviewRow, bulkCreate: bulkCreateExpenses, hasProperty: true },
  coOwners: { fieldSpecs: CO_OWNER_FIELDS, toReviewRow: toCoOwnerReviewRow, bulkCreate: bulkCreateCoOwners, hasProperty: true },
  maintenance: { fieldSpecs: MAINTENANCE_FIELDS, toReviewRow: toMaintenanceReviewRow, bulkCreate: bulkCreateMaintenance, hasProperty: true },
  inspections: { fieldSpecs: INSPECTION_FIELDS, toReviewRow: toInspectionReviewRow, bulkCreate: bulkCreateInspections, hasProperty: true },
  certifications: { fieldSpecs: CERTIFICATION_FIELDS, toReviewRow: toCertificationReviewRow, bulkCreate: bulkCreateCertifications, hasProperty: true },
  safetyRisks: { fieldSpecs: SAFETY_RISK_FIELDS, toReviewRow: toSafetyRiskReviewRow, bulkCreate: bulkCreateSafetyRisks, hasProperty: true },
  emergencyContacts: { fieldSpecs: EMERGENCY_CONTACT_FIELDS, toReviewRow: toEmergencyContactReviewRow, bulkCreate: bulkCreateEmergencyContacts, hasProperty: true },
  successors: { fieldSpecs: SUCCESSOR_FIELDS, toReviewRow: toSuccessorReviewRow, bulkCreate: bulkCreateSuccessors, hasProperty: false },
  landParcels: { fieldSpecs: LAND_PARCEL_FIELDS, toReviewRow: toLandParcelReviewRow, bulkCreate: bulkCreateLandParcels, hasProperty: true },
};

// ─── Extraction (one AI call) ────────────────────────────────────────

export type SheetPreview = { name: string; rows: string[][] };

const ENTITY_PROMPT_ENTRIES: { type: string; fields: string[] }[] = [
  { type: "properties", fields: ["propertyName", "propertyType", "status", "addressLine", "addressLine2", "city", "province", "zip", "country", "yearBuilt", "totalArea", "bedrooms", "bathrooms", "parkingSpaces", "storageUnit", "purchasePrice", "purchaseDate", "currentMarketValue", "outstandingMortgage", "monthlyPayment", "interestRate", "annualPropertyTax", "taxAssessmentValue", "annualInsurance", "ownershipStatus"] },
  { type: "tenants", fields: ["name", "unit", "rent", "status", "email", "phone", "property"] },
  { type: "valuations", fields: ["property", "price", "valuationDate"] },
  { type: "leases", fields: ["property", "unit", "stage", "startDate", "endDate", "monthlyRent", "termMonths", "renewalStatus", "tenant"] },
  { type: "payments", fields: ["property", "date", "kind", "amount", "method", "status"] },
  { type: "expenses", fields: ["property", "date", "category", "amount", "note"] },
  { type: "coOwners", fields: ["property", "name", "role", "sharePercent", "email", "phone", "address", "taxEntity", "tax1099Status"] },
  { type: "maintenance", fields: ["property", "severity", "title", "status", "cost"] },
  { type: "inspections", fields: ["property", "type", "inspector", "status", "inspectedAt", "issues"] },
  { type: "certifications", fields: ["property", "name", "status", "issuedAt", "expiresAt", "inspector"] },
  { type: "safetyRisks", fields: ["property", "severity", "title", "description", "status"] },
  { type: "emergencyContacts", fields: ["property", "name", "phone", "sub"] },
  { type: "successors", fields: ["name", "relation", "role", "share", "email", "phone"] },
  { type: "landParcels", fields: ["property", "sizeM2", "widthM", "lengthM", "zoningCode", "zoningClass", "elevationM", "slopeAngleDeg", "terrainType"] },
];

function buildPrompt(previews: SheetPreview[]): string {
  const entityList = ENTITY_PROMPT_ENTRIES.map((e) => `- ${e.type}: ${e.fields.join(", ")}`).join("\n");
  return [
    "You are migrating a client's spreadsheet workbook into Valgate, a property management platform.",
    "",
    "Valgate tracks 14 entity types. For each one, look through the workbook's sheets and determine",
    "whether a sheet contains a register of that entity (one row per record). If found, return:",
    "- primarySheet: the sheet name",
    "- sources: an ARRAY of { field, sheet, column } — one entry per Valgate field you can locate.",
    "  `field` is the Valgate field name; `sheet`/`column` are where its data lives (null if not found).",
    "  Omit fields you cannot map at all. Return [] if the entity has no mappable fields.",
    "- joins: an array describing how to link fields that live in a different sheet (joinColumn = primaryColumn).",
    "  Return [] when every field lives in the primary sheet.",
    "",
    "If an entity type is NOT present in the workbook, return null for it.",
    "",
    "Entity types and their fields:",
    entityList,
    "",
    "Rules:",
    "- Only map a field when a column genuinely matches it. If nothing fits, return { sheet: null, column: null }.",
    "- Never invent a sheet or column name.",
    "- For a NAME field (e.g. propertyName), prefer a human-readable descriptive value — a name, label,",
    "  or street address. Do NOT map it to an internal ID / reference-code column (values like",
    "  \"PROP-0001\", \"CLI-001\", \"REF-123\") when a descriptive name or address column exists in the sheet.",
    "- \"property\" means the property's label, name, or ID as it appears in the sheet — not a Valgate id.",
    "- A single-sheet workbook is fine: every field maps to a column in the same sheet, joins is empty.",
    "- If a required field lives in a different sheet, create a join. Choose join columns by the sample data.",
    "",
    `Workbook (each sheet: name, headers, up to 3 sample rows): ${JSON.stringify(previews)}`,
  ].join("\n");
}

export async function extractAll(previews: SheetPreview[]): Promise<UnifiedPlan> {
  // No API key (e.g. demo mode): return an empty plan so the flow degrades to a
  // "nothing detected" state rather than crashing. This is the ONLY silent path.
  if (!env.OPENAI_API_KEY) {
    const firstSheet = previews[0]?.name ?? "";
    return {
      properties: { primarySheet: firstSheet, joins: [], sources: [] },
      tenants: null, valuations: null, leases: null, payments: null, expenses: null,
      coOwners: null, maintenance: null, inspections: null, certifications: null,
      safetyRisks: null, emergencyContacts: null, successors: null, landParcels: null,
    };
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: unifiedPlanSchema,
      prompt: buildPrompt(previews),
    });
    return object;
  } catch (err) {
    // Surface the real failure instead of pretending the workbook was empty.
    // A silent empty-plan fallback here used to render as "couldn't find any
    // records", which hid genuine errors (e.g. a bad schema rejected by the
    // model API). The caller (extractAllAction) turns this into an honest
    // "couldn't read that workbook, try again" message.
    log.error("unified-extract extractAll failed", { err: String(err) });
    throw err;
  }
}

// ─── Apply (deterministic) ───────────────────────────────────────────

function sheetsToSheetData(sheets: SheetMatrix[]): SheetData[] {
  return sheets
    .map((s) => {
      const { headers, rows } = extractRows(s.matrix, findHeaderRow(s.matrix));
      return { name: s.name, headers, rows };
    })
    .filter((s) => s.headers.length > 0 && s.rows.length > 0);
}

export async function applyPlan(
  sheets: SheetMatrix[],
  plan: UnifiedPlan,
  ctx: Ctx,
): Promise<PerEntityRows> {
  const sheetData = sheetsToSheetData(sheets);
  const properties = await listProperties(ctx);
  const matches: PropertyMatch[] = properties.map((p) => ({
    id: p.id, name: p.name, code: p.code, title: p.title,
  }));

  const result = {} as PerEntityRows;

  for (const [entityTypeStr, entityPlan] of Object.entries(plan)) {
    if (!entityPlan) continue;
    const entityType = entityTypeStr as EntityType;
    const handler = entityHandlers[entityType];
    if (!handler) continue;

    // The model returns sources as an array (strict-output safe); the
    // deterministic apply layer wants a field→{sheet,column} record. Convert.
    const sources: Record<string, { sheet: string | null; column: string | null }> = {};
    for (const s of entityPlan.sources) {
      sources[s.field] = { sheet: s.sheet, column: s.column };
    }

    const raw: RawPlan = {
      primarySheet: entityPlan.primarySheet,
      joins: entityPlan.joins ?? [],
      sources,
    };

    const sanitized = sanitizePlan(raw, sheetData, handler.fieldSpecs);
    if (!sanitized) continue;

    const assembled = assembleRows(sheetData, sanitized, handler.fieldSpecs);
    if (assembled.length === 0) continue;

    result[entityType] = assembled.map((row) => handler.toReviewRow(row, matches));
  }

  return result;
}

// ─── Commit ──────────────────────────────────────────────────────────

export async function bulkCreateEntity(
  ctx: Ctx,
  entityType: EntityType,
  rows: ReviewRow[],
): Promise<BulkResult> {
  const handler = entityHandlers[entityType];
  if (!handler) return { created: 0, failures: [{ row: 0, name: "", reason: "Unknown entity type" }] };
  return handler.bulkCreate(ctx, rows);
}
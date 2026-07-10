import "server-only";
import { listProperties } from "@/lib/services/properties";
import { createPropertyValuation } from "@/lib/services/property-valuations";
import { NewPropertyValuationSchema, MONTH_REGEX } from "@/lib/data/types/property-valuation";
import type { Ctx } from "@/lib/services/_mapping";
import { log } from "@/lib/log";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import {
  planFieldSources,
  assembleRows,
  type SheetData,
  type FieldSpec,
  type AssembledRow,
} from "@/lib/services/entity-import";

// ─────────────────────────────────────────────────────────────────────────────
// Valuation import — the thin, valuation-specific layer over the generic
// field-first engine (entity-import.ts). It mirrors tenant-import.ts, but:
//   - it is ONE-TO-MANY (a property can have several valuations, so the register
//     is one row PER VALUATION, not per property),
//   - all its fields live in a single sheet (VALUATION HISTORY) — no cross-sheet
//     join is needed, though the engine handles a join fine if the AI finds one,
//   - price is schema-POSITIVE: a valuation with no/zero price is not a real
//     valuation, so that row is BLOCKED (never defaulted to 0), and
//   - the valuation date drives TWO Valgate fields — a display month ('MMM YYYY')
//     and an epoch-ms recordedAt — both derived from the same source column.
// ─────────────────────────────────────────────────────────────────────────────

// We source three raw fields from the workbook; month + recordedAt are both
// derived from valuationDate in toValuationCandidate below.
//   - property: the property reference (its Valgate id, label, or title),
//   - price: the market value figure,
//   - valuationDate: the date the valuation was recorded.
export const VALUATION_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this valuation is for — its ID, name, label, or title as it appears in the sheet (e.g. a 'Property ID' column)." },
  { field: "price", required: true, description: "The valuation's market value as a number — the appraised or estimated worth (e.g. a 'Market Value (USD)' column)." },
  { field: "valuationDate", required: true, description: "The date this valuation was made or recorded (e.g. a 'Valuation Date' column)." },
];

// The three-letter month codes, indexed by getUTCMonth(). Fixed (not locale-formatted) so the output
// is deterministic across machines and matches PropertyValuationSchema's /^[A-Z][a-z]{2} \d{4}$/.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Parse any date string (ISO like "2025-10-05T00:00:00.000Z", or a JS Date string like
// "Sat Oct 04 2025 00:00:00 GMT+0000 (…)" — which is what String(Date) produces when the parser
// hands us a real date cell) into a 'MMM YYYY' label. Junk → "" (flagged as missing upstream).
// UTC is used deliberately so a T00:00:00Z date never rolls back a day into the previous month.
export function parseMonth(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const date = new Date(trimmed);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Parse a date string into epoch milliseconds. Junk → 0 (the candidate then derives a timestamp
// from the reviewed month instead, so a valid month always yields a valid recordedAt).
export function parseTimestamp(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const ms = new Date(trimmed).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

// Turn a 'MMM YYYY' month label into epoch ms at the first of that month (UTC). Used as the
// recordedAt fallback when the source date was unparseable but the user supplied/kept a valid
// month. Returns 0 if the month is not a real 'MMM YYYY' label (same set the schema accepts).
export function monthToTimestamp(month: string): number {
  const trimmed = month.trim();
  if (!MONTH_REGEX.test(trimmed)) return 0;
  const monthIndex = MONTHS.indexOf(trimmed.slice(0, 3));
  return Date.UTC(Number(trimmed.slice(4)), monthIndex, 1);
}

// Pick the recordedAt to store for a reviewed valuation. The month field is editable, so the sheet's
// original timestamp can end up in a DIFFERENT month than the reviewed label. We keep the exact
// source timestamp (preserving its day) only while it still falls in the reviewed month; once the
// user corrects the month — or the source date was junk (0) — we derive the first of that month, so
// the stored timestamp and the displayed month never disagree (which would misorder the history).
export function recordedAtForMonth(sourceMs: number, month: string): number {
  if (sourceMs > 0 && parseMonth(new Date(sourceMs).toISOString()) === month.trim()) {
    return sourceMs;
  }
  return monthToTimestamp(month);
}

// Turn free-text price ("$210,000", "210000 USD") into a non-negative number. Anything unparseable
// or negative becomes 0 — which is NOT importable (price must be positive), so the candidate flags
// it and the review table blocks that row. Deliberately never defaults a real price to 0.
export function parsePrice(raw: string): number {
  // A minus sign means a negative/credit figure — not a valid price. Reject BEFORE stripping, since
  // stripping non-digits would silently turn "-50" into a positive 50.
  if (/-/.test(raw)) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value) || value <= 0) return 0;
  return value;
}

// One reviewed valuation, ready for the review table and (after edits) for creation.
export type ValuationCandidate = {
  // Display month ('MMM YYYY'), derived from the sheet's valuation date. "" when the date was junk.
  month: string;
  // The market value as a positive number, or 0 when missing/invalid (blocks the row in review).
  price: number;
  // The valuation date as epoch ms, or 0 when the date was unparseable.
  recordedAt: number;
  // The property value as sourced from the sheet (shown in review so the user sees what we matched).
  rawProperty: string;
  // The resolved Valgate property id, or "" when we could not auto-match it — the review table then
  // shows a property picker for that row.
  propertyId: string;
  // Blocking or heads-up problems for this row (no price, unmatched property, bad date…).
  issues: string[];
};

// A property the user can pick from in the review table (id + human label).
export type PropertyOption = { id: string; label: string };

export type MapValuationsResult = {
  primarySheet: string | null;
  candidates: ValuationCandidate[];
  // Every property in the caller's org, for the review-table picker.
  properties: PropertyOption[];
};

// Build the reviewable candidate from one assembled row. PURE (no DB): property linkage is applied
// separately in resolveProperty so this stays unit-testable.
export function toValuationCandidate(assembled: AssembledRow): ValuationCandidate {
  const v = assembled.values;
  const issues: string[] = [];

  const month = parseMonth(v.valuationDate ?? "");
  const price = parsePrice(v.price ?? "");
  const recordedAt = parseTimestamp(v.valuationDate ?? "");

  if (!v.property) issues.push("No property on the sheet");
  if (price <= 0) issues.push("No valid price — a valuation needs a positive amount");
  if (!month) issues.push("No valid valuation date");

  return {
    month,
    price,
    recordedAt,
    rawProperty: v.property ?? "",
    propertyId: "",
    issues,
  };
}

// Full pipeline for the map step: AI sources the valuation fields across the whole workbook, we
// assemble + normalize rows, auto-match each to a property, and load the org's property list for the
// review picker. Auth is enforced by the caller (the server action passes an authenticated ctx).
export async function mapValuations(ctx: Ctx, sheets: SheetData[]): Promise<MapValuationsResult> {
  const properties = await listProperties(ctx);
  const options: PropertyOption[] = properties.map((p) => ({ id: p.id, label: p.name }));
  const matches: PropertyMatch[] = properties.map((p) => ({ id: p.id, name: p.name, code: p.code, title: p.title }));

  const plan = await planFieldSources(sheets, VALUATION_FIELDS, "valuation");
  if (!plan) {
    // AI unavailable → nothing to review. The UI surfaces this as a soft failure.
    return { primarySheet: null, candidates: [], properties: options };
  }

  const assembled = assembleRows(sheets, plan, VALUATION_FIELDS);
  const candidates = assembled.map((row) => {
    const candidate = toValuationCandidate(row);
    candidate.propertyId = resolveProperty(candidate.rawProperty, matches);
    if (!candidate.propertyId && candidate.rawProperty) {
      candidate.issues.push("No matching property — pick one");
    }
    return candidate;
  });

  return { primarySheet: plan.primarySheet, candidates, properties: options };
}

// What the review table sends back to create: the reviewed values plus the chosen property id (the
// user may have picked it manually for unmatched rows).
export type ValuationDraft = {
  propertyId: string;
  month: string;
  price: number;
  recordedAt: number;
};

export type BulkCreateValuationsResult = {
  created: number;
  failures: { row: number; label: string; reason: string }[];
};

// Create one valuation per reviewed draft, scoped to the caller's org via ctx (createPropertyValuation
// → scopedInsert writes to ctx.orgId only). Per-row + partial success: one bad row never rolls back
// the others. Every draft is validated by NewPropertyValuationSchema before insert, so a missing
// property, a non-positive price, or a malformed month fails that row cleanly instead of corrupting
// data. recordedAt falls back to the first of the reviewed month when the source date was unparseable.
export async function bulkCreateValuations(ctx: Ctx, drafts: ValuationDraft[]): Promise<BulkCreateValuationsResult> {
  let created = 0;
  const failures: BulkCreateValuationsResult["failures"] = [];

  // propertyId is client-controlled (the review table sends whatever the picker held), so verify each
  // one really belongs to THIS org before writing — otherwise a crafted draft could hang a valuation
  // off another org's property id (IDOR). The picker only ever offers org properties, so a legitimate
  // import always passes this check.
  const orgPropertyIds = new Set((await listProperties(ctx)).map((p) => p.id));

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]!;
    const label = draft.month ? `${draft.month} valuation` : `Row ${i + 1}`;

    if (!orgPropertyIds.has(draft.propertyId)) {
      failures.push({
        row: i,
        label,
        reason: draft.propertyId ? "That property isn't in your portfolio." : "No property selected.",
      });
      continue;
    }

    try {
      const input = NewPropertyValuationSchema.parse({
        propertyId: draft.propertyId,
        month: draft.month,
        price: draft.price,
        recordedAt: recordedAtForMonth(draft.recordedAt, draft.month),
      });
      await createPropertyValuation(ctx, input);
      created++;
    } catch (err) {
      log.warn("valuation-import row create failed", { row: i, err: String(err) });
      failures.push({
        row: i,
        label,
        reason: "Could not be created — check the price and date.",
      });
    }
  }

  return { created, failures };
}

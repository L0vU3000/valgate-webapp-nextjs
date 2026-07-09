import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { defaultForm, type FormData as WizardForm, type WizardStatus } from "@/app/_shared/add-property/types";
import { mapWizardToProperty } from "@/app/_shared/add-property/map-to-property";
import { createProperty as svcCreateProperty } from "@/lib/services/properties";
import type { Ctx } from "@/lib/services/_mapping";

// The Valgate fields the AI can map a spreadsheet column onto. Drives both the AI response schema
// and the row-application below, so the two never drift.
const MAPPABLE_FIELDS = [
  "propertyName",
  "propertyType",
  "status",
  "addressLine",
  "addressLine2",
  "city",
  "province",
  "zip",
  "country",
  "yearBuilt",
  "totalArea",
  "bedrooms",
  "bathrooms",
  "parkingSpaces",
  "storageUnit",
  "purchasePrice",
  "purchaseDate",
  "currentMarketValue",
  "outstandingMortgage",
  "monthlyPayment",
  "interestRate",
  "annualPropertyTax",
  "taxAssessmentValue",
  "annualInsurance",
  "ownershipStatus",
] as const;

export type MappableField = (typeof MAPPABLE_FIELDS)[number];
// For each Valgate field: the source column header it maps to, or null if the sheet has no match.
export type ColumnMapping = Record<MappableField, string | null>;

// A single spreadsheet row turned into a wizard FormData candidate, plus review metadata.
export type ImportCandidate = {
  form: WizardForm;
  // Human-readable address we attempted to geocode (shown in review).
  address: string;
  // True when we could not resolve coordinates — the row still imports against the fallback centroid.
  needsLocation: boolean;
  // Problems that would block creation (e.g. missing name). Empty = importable.
  issues: string[];
};

// Zod schema the model must return: one nullable column name per field. Descriptions steer matching.
const mappingSchema = z.object(
  Object.fromEntries(
    MAPPABLE_FIELDS.map((f) => [f, z.string().nullable().describe(`Source column header that best matches "${f}", or null`)]),
  ) as Record<MappableField, z.ZodNullable<z.ZodString>>,
);

// Ask the model ONCE to match the user's column headers to Valgate fields. Only headers + a few
// sample rows are sent (no secrets, no full dataset). Falls back to an all-null mapping when the
// API key is missing or the call fails, so the importer degrades to manual mapping instead of
// crashing.
export async function mapColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<ColumnMapping> {
  const empty = Object.fromEntries(MAPPABLE_FIELDS.map((f) => [f, null])) as ColumnMapping;
  if (!env.OPENAI_API_KEY) return empty;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: mappingSchema,
      prompt: [
        "You are mapping columns from a property owner's spreadsheet onto a fixed set of fields.",
        "For each target field, pick the ONE source column header whose data best matches it, or null if none fits.",
        "Never invent a header that is not in the provided list. A source column may match at most one field.",
        `Property type values are one of: residential, commercial, multi-unit, retail, land, industrial, construction, other.`,
        `Status values are one of: Rented, Vacant, Owner-Occupied.`,
        "",
        `Source column headers: ${JSON.stringify(headers)}`,
        `Sample rows (up to 5): ${JSON.stringify(sampleRows.slice(0, 5))}`,
      ].join("\n"),
    });
    // Keep only mappings that point at a real header (guards against a hallucinated column name).
    const cleaned = { ...empty };
    for (const f of MAPPABLE_FIELDS) {
      const col = object[f];
      if (col && headers.includes(col)) cleaned[f] = col;
    }
    return cleaned;
  } catch (err) {
    log.warn("property-import mapColumns failed", { err: String(err) });
    return empty;
  }
}

// Coerce a free-text property type into one of the wizard's allowed enum values.
function normalizeType(raw: string): string {
  const v = raw.toLowerCase();
  if (/resid|house|home|apartment|condo|flat|villa/.test(v)) return "residential";
  if (/multi|duplex|triplex|units?/.test(v)) return "multi-unit";
  if (/retail|shop|store/.test(v)) return "retail";
  if (/indus|warehouse|factory/.test(v)) return "industrial";
  if (/construc|develop/.test(v)) return "construction";
  if (/land|plot|lot/.test(v)) return "land";
  if (/commerc|office/.test(v)) return "commercial";
  return raw ? "other" : "";
}

// Coerce a free-text status into the wizard's allowed enum, defaulting to blank (-> "Vacant" later).
function normalizeStatus(raw: string): WizardStatus {
  const v = raw.toLowerCase();
  if (/rent|leas|occupied.*tenant|tenant/.test(v)) return "Rented";
  if (/owner|self/.test(v)) return "Owner-Occupied";
  if (/vacant|empty|available/.test(v)) return "Vacant";
  return "";
}

// Apply one mapping to every row -> wizard FormData candidates. Pure + deterministic; the AI is
// not involved here. Value cleanup (currency, numbers) happens later via mapWizardToProperty's
// parsers, so raw strings are fine to carry through.
export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping): ImportCandidate[] {
  return rows.map((row) => {
    const get = (field: MappableField): string => {
      const col = mapping[field];
      return col ? (row[col] ?? "").trim() : "";
    };

    const form: WizardForm = {
      ...defaultForm,
      method: "manual",
      propertyName: get("propertyName"),
      propertyType: normalizeType(get("propertyType")),
      status: normalizeStatus(get("status")),
      addressLine: get("addressLine"),
      addressLine2: get("addressLine2"),
      city: get("city"),
      province: get("province"),
      zip: get("zip"),
      country: get("country"),
      yearBuilt: get("yearBuilt"),
      totalArea: get("totalArea"),
      bedrooms: get("bedrooms"),
      bathrooms: get("bathrooms"),
      parkingSpaces: get("parkingSpaces"),
      storageUnit: get("storageUnit"),
      purchasePrice: get("purchasePrice"),
      purchaseDate: get("purchaseDate"),
      currentMarketValue: get("currentMarketValue"),
      outstandingMortgage: get("outstandingMortgage"),
      monthlyPayment: get("monthlyPayment"),
      interestRate: get("interestRate"),
      annualPropertyTax: get("annualPropertyTax"),
      taxAssessmentValue: get("taxAssessmentValue"),
      annualInsurance: get("annualInsurance"),
      ownershipStatus: get("ownershipStatus"),
    };

    const address = [form.addressLine, form.city, form.province, form.country]
      .filter(Boolean)
      .join(", ");

    const issues: string[] = [];
    if (!form.propertyName) issues.push("Missing property name");
    if (!form.propertyType) issues.push("Missing property type");

    return { form, address, needsLocation: !address, issues };
  });
}

// Resolve an address string to [lng, lat] via Mapbox, or null if it cannot be geocoded. Uses the
// same public Mapbox token the client geocoder uses.
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const query = address.trim();
  if (!query) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { center?: [number, number] }[] };
    const center = data.features?.[0]?.center;
    if (center && center.length === 2) return [center[0], center[1]];
    return null;
  } catch (err) {
    log.warn("property-import geocode failed", { err: String(err) });
    return null;
  }
}

// Fill mapCenter on each candidate by geocoding its address. Each UNIQUE address is resolved once,
// in small parallel batches, so a 100-row sheet doesn't fire 100 sequential requests (which could
// exceed the server action's time budget). Flags rows that still lack coordinates.
const GEOCODE_CONCURRENCY = 6;

export async function geocodeCandidates(candidates: ImportCandidate[]): Promise<ImportCandidate[]> {
  const uniqueAddresses = [...new Set(candidates.map((c) => c.address).filter(Boolean))];
  const resolved = new Map<string, [number, number] | null>();

  for (let i = 0; i < uniqueAddresses.length; i += GEOCODE_CONCURRENCY) {
    const batch = uniqueAddresses.slice(i, i + GEOCODE_CONCURRENCY);
    const centers = await Promise.all(batch.map((a) => geocodeAddress(a)));
    batch.forEach((a, j) => resolved.set(a, centers[j] ?? null));
  }

  return candidates.map((c) => {
    if (!c.address) return { ...c, needsLocation: true };
    const center = resolved.get(c.address) ?? null;
    return {
      ...c,
      form: center ? { ...c.form, mapCenter: center } : c.form,
      needsLocation: !center,
    };
  });
}

export type BulkCreateResult = {
  created: number;
  failures: { row: number; name: string; reason: string }[];
};

// Create one property per form, org-scoped via ctx (svcCreateProperty enforces membership + writes
// to ctx.orgId only — no cross-org path). Per-row + partial success: one bad row never rolls back
// the others. A form without coordinates gets a last-chance geocode, then falls back to the centroid
// inside mapWizardToProperty. Every field is validated by PropertySchema inside svcCreateProperty.
export async function bulkCreateProperties(ctx: Ctx, forms: WizardForm[]): Promise<BulkCreateResult> {
  let created = 0;
  const failures: BulkCreateResult["failures"] = [];

  for (let i = 0; i < forms.length; i++) {
    const form = forms[i]!;
    try {
      let resolved = form;
      if (!resolved.mapCenter) {
        const address = [form.addressLine, form.city, form.province, form.country].filter(Boolean).join(", ");
        const center = address ? await geocodeAddress(address) : null;
        if (center) resolved = { ...form, mapCenter: center };
      }
      await svcCreateProperty(ctx, mapWizardToProperty(resolved));
      created++;
    } catch (err) {
      log.warn("property-import row create failed", { row: i, err: String(err) });
      failures.push({
        row: i,
        name: form.propertyName || `Row ${i + 1}`,
        reason: "Could not be created — check the required fields.",
      });
    }
  }

  return { created, failures };
}

import type { ExtractedProperty } from "@/lib/services/document-scan";
import type { Property } from "@/lib/data/types/property";

/**
 * One field where a document and the property disagree.
 *
 * `current` and `suggested` are what a person reads; `next` is what goes into the patch, already in
 * the property's own type (the model returns everything as text, an integer field must not be
 * patched with a string or the update action's schema rejects it).
 */
export type SuggestedUpdate = {
  /** The property field name, so this can go straight into the update action's patch. */
  field: string;
  label: string;
  /** What the property says today. Empty string when the field is unset. */
  current: string;
  /** What the document says. */
  suggested: string;
  /** The value to write when the user accepts. */
  next: string | number;
  /** Where the user stands on this one. A fresh read starts every entry at "pending". */
  status: SuggestionStatus;
};

export type SuggestionStatus = "pending" | "accepted" | "dismissed";

/**
 * The same list with one entry answered, ready to be stored back on the document.
 *
 * A decision is remembered rather than re-derived, which is the whole reason these are persisted:
 * a suggestion that reappears after being declined is worse than no suggestion. An unknown field is
 * left alone — the list can be replaced under the UI's feet by a re-read, and a stale decision must
 * not resurrect or invent an entry.
 */
export function decideSuggestion(
  entries: SuggestedUpdate[],
  field: string,
  status: SuggestionStatus,
): SuggestedUpdate[] {
  return entries.map((entry) => (entry.field === field ? { ...entry, status } : entry));
}

// Extraction names one of these differently: it returns the name it READ, the property stores `name`.
// `numeric` marks the fields the property stores as numbers, so a suggestion can be coerced back.
const FIELDS: {
  extracted: keyof ExtractedProperty;
  field: string;
  label: string;
  numeric?: boolean;
}[] = [
  { extracted: "propertyName", field: "name", label: "Name" },
  { extracted: "propertyType", field: "type", label: "Type" },
  { extracted: "addressLine", field: "addressLine", label: "Address" },
  { extracted: "city", field: "city", label: "City" },
  { extracted: "province", field: "province", label: "Province" },
  { extracted: "zip", field: "zip", label: "Postal code" },
  { extracted: "country", field: "country", label: "Country" },
  { extracted: "yearBuilt", field: "yearBuilt", label: "Year built", numeric: true },
  { extracted: "totalArea", field: "totalArea", label: "Total area" },
  { extracted: "bedrooms", field: "bedrooms", label: "Bedrooms", numeric: true },
  { extracted: "bathrooms", field: "bathrooms", label: "Bathrooms", numeric: true },
  { extracted: "parkingSpaces", field: "parkingSpaces", label: "Parking spaces", numeric: true },
  { extracted: "purchasePrice", field: "purchasePrice", label: "Purchase price" },
  { extracted: "currentMarketValue", field: "currentMarketValue", label: "Market value", numeric: true },
  { extracted: "ownershipStatus", field: "ownershipStatus", label: "Ownership" },
  // `purchaseDate` is deliberately absent: the property stores it as a timestamp and the model
  // returns "YYYY-MM-DD", so a text comparison would flag every dated document as a change even
  // when both say the same day. Comparing dates properly needs its own normalisation, and a
  // suggestion that is wrong every time is worse than one field fewer.
];

const asText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

/** Digits and a decimal point only, so "€450,000" and 450000 are the same number. */
const asDigits = (value: string): string => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? String(parsed) : "";
};

const differs = (a: string, b: string, numeric: boolean): boolean => {
  if (numeric) {
    const da = asDigits(a);
    const db = asDigits(b);
    // Both unparseable: fall back to text so the user still sees what the document said.
    if (da && db) return da !== db;
  }
  return a.toLowerCase() !== b.toLowerCase();
};

/**
 * What a scanned document disagrees with on an existing property.
 *
 * Pure on purpose: the extraction comes from a paid model and the property from the database, and
 * neither is needed to decide which differences are worth showing. The rules are the interesting
 * part — a document that says nothing about a field must not blank it, and one that agrees must not
 * produce a suggestion — so they are testable without a database or a model call.
 *
 * Nothing is written here: every suggestion is the user's to accept or ignore.
 */
export function suggestPropertyUpdates(
  property: Property,
  extracted: ExtractedProperty,
): SuggestedUpdate[] {
  const row = property as unknown as Record<string, unknown>;
  const suggestions: SuggestedUpdate[] = [];

  for (const { extracted: source, field, label, numeric } of FIELDS) {
    const suggested = asText(extracted[source]);
    // The document said nothing about this field. Silence is not a proposal to delete.
    if (!suggested) continue;

    const current = asText(row[field]);
    if (current && !differs(current, suggested, !!numeric)) continue; // they agree

    const digits = numeric ? asDigits(suggested) : "";
    suggestions.push({
      field,
      label,
      current,
      suggested,
      // Only coerce when the digits actually parse; otherwise send the text and let the update
      // action's own schema have the final word.
      next: digits ? Number(digits) : suggested,
      // A fresh read starts unanswered. Earlier decisions are deliberately not carried over: the
      // document may have been replaced, and a new claim deserves a new look.
      status: "pending",
    });
  }

  return suggestions;
}

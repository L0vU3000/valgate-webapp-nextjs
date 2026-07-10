// Self-consistency reconciliation for document scans. Pure + dependency-free (the ExtractedProperty
// import is type-only, so the server-only document-scan.ts is never loaded at runtime -- same trick as
// scan-to-form.ts). This lets us unit-test the voting logic without any AI/DB.
//
// Why this exists: handwritten Khmer numerals read UNSTABLY -- the same deed's area can come back as
// 1200, 2000, or null across identical model calls. So we run the extraction N times and reconcile
// each field: if the runs agree, keep the value; if they disagree, keep the MAJORITY value and mark
// that field low-confidence so the wizard can ask the user to double-check it before saving.

import type { ExtractedProperty } from "./document-scan";

export type ScanResult = {
  // The reconciled property -- one value per field, the majority answer across the N runs.
  extracted: ExtractedProperty;
  // Field names the runs disagreed on. These are the same keys as ExtractedProperty (and, by design,
  // the wizard's FormData keys), so the UI can flag them directly.
  lowConfidence: (keyof ExtractedProperty)[];
};

// Numeric fields are compared on digits only, so "2000" and "2,000 sq m" count as agreement (the
// wizard strips units later anyway). Everything else is compared case-insensitively on trimmed text.
const NUMERIC_FIELDS = new Set<keyof ExtractedProperty>([
  "yearBuilt", "totalArea", "bedrooms", "bathrooms", "parkingSpaces", "purchasePrice", "currentMarketValue",
]);

// A stable key for the agreement check only -- the value we RETURN is always the original, unmodified
// one. Present values are prefixed with "value:" and an absent (null) reading is the fixed marker
// "absent"; the disjoint namespaces mean a real value can never be mistaken for a missing one.
function normalizeForVote(field: keyof ExtractedProperty, value: unknown): string {
  if (value === null || value === undefined) return "absent";
  const text = String(value).trim().toLowerCase();
  if (NUMERIC_FIELDS.has(field)) {
    const match = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
    return "value:" + (match ? match[0] : "");
  }
  return "value:" + text;
}

// Reconcile N independent extractions of the same document into one result plus a low-confidence list.
// Majority wins per field; on a tie the first-seen answer wins (Map preserves insertion order, so the
// earliest run breaks ties deterministically).
export function reconcileExtractions(runs: ExtractedProperty[]): ScanResult {
  if (runs.length === 0) {
    throw new Error("reconcileExtractions needs at least one extraction run");
  }

  const fieldKeys = Object.keys(runs[0]) as (keyof ExtractedProperty)[];
  const extracted = {} as ExtractedProperty;
  const lowConfidence: (keyof ExtractedProperty)[] = [];

  for (const field of fieldKeys) {
    // Tally how many runs voted for each distinct answer, and remember one raw value per answer so we
    // can return the winner's ORIGINAL text (not the normalized comparison key).
    const votes = new Map<string, number>();
    const rawByVote = new Map<string, ExtractedProperty[keyof ExtractedProperty]>();

    for (const run of runs) {
      const rawValue = run[field];
      const voteKey = normalizeForVote(field, rawValue);
      votes.set(voteKey, (votes.get(voteKey) ?? 0) + 1);
      if (!rawByVote.has(voteKey)) {
        rawByVote.set(voteKey, rawValue);
      }
    }

    // Pick the answer with the most votes; strictly-greater keeps the first-seen winner on a tie.
    let winningVote = "";
    let winningCount = 0;
    for (const [voteKey, count] of votes) {
      if (count > winningCount) {
        winningCount = count;
        winningVote = voteKey;
      }
    }

    // Assign the winner's raw value back onto the reconciled object.
    (extracted as Record<string, unknown>)[field] = rawByVote.get(winningVote);

    // More than one distinct answer means the runs disagreed here -- flag it for human review.
    if (votes.size > 1) {
      lowConfidence.push(field);
    }
  }

  return { extracted, lowConfidence };
}

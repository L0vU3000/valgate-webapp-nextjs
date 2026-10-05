import "server-only";
import { listDocuments } from "@/lib/services/documents";
import { decide } from "@/lib/services/jev";
import type { Ctx } from "@/lib/services/_mapping";

// Evidence matching: which uploaded documents actually support a pillar's verification claim?
//
// Today a human opens the unlock wizard and ticks the documents themselves (`onVerify({ docIds })`
// in components/feature-unlock/pillars/*Unlock.tsx). That click is the cost this replaces.
//
// Jev answers ONE noul question per document — "does this document evidence <this claim>?" — and
// we rank by that probability. It is a judgement over text, which is exactly what Jev is for.
//
// ADVISORY ONLY. `submitVerification` writes status "verified" the moment it is called, so this
// function must never call it. It returns pre-ticked document ids; a human still confirms, edits,
// and submits. Removing that step would let one classifier silently certify a property.
//
// Jev reads `aiSummary` (produced by the summarize route), not the raw file: Jev is text-only — it
// cannot see an image — and the document's own derived text is the cheapest faithful input.

/** A document with the two fields this decision needs. Structurally a subset of `Document`. */
type EvidenceCandidate = {
  id: string;
  name: string;
  aiSummary?: string | null;
};

export type EvidenceClaim = {
  /** What the pillar asserts, in the user's words — e.g. "123 Riverside Road, Phnom Penh". */
  claim: string;
  /** One line on what counts as evidence, so the criteria are not implicit. */
  criterion: string;
};

export type EvidenceSuggestion = {
  documentId: string;
  documentName: string;
  /** Probability the document evidences the claim, 0..1. Higher = stronger. */
  noul: number;
};

// Jev's calibration is what makes a threshold meaningful, so the bands are named here rather than
// scattered as magic numbers in the UI. Below MIN a document is not pre-ticked; at or above MAX it
// is. Nothing in between is hidden — it is ranked, just not selected.
const MIN_NOUL = 0.5;
const MAX_NOUL = 0.8;

export type EvidenceMatchResult = {
  /** Ranked best-first. Empty when Jev is unavailable — callers fall back to no pre-selection. */
  suggestions: EvidenceSuggestion[];
  /** Ids at or above MAX_NOUL — safe to pre-tick. */
  confidentDocumentIds: string[];
  /** Ids between MIN and MAX — rank-and-review, do not pre-tick. */
  uncertainDocumentIds: string[];
};

/** Trims a summary to a bounded, single-line excerpt so one long document cannot dominate the call. */
function excerpt(text: string, max = 1200): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

/**
 * Pre-selects evidence documents for a pillar. Never throws and never submits: on any problem
 * (no key, no summaries yet, Jev down, timeout) it returns an empty result and the wizard behaves
 * exactly as it does today — the human ticks the boxes.
 *
 * `ponytail:` one Jev call per candidate document, run concurrently. At $0.00002/call and a
 * handful of documents per property that is fractions of a cent; batch only if a property ever
 * carries dozens of documents, which would also blow the 800ms budget.
 */
export async function suggestEvidence(
  ctx: Ctx,
  propertyId: string,
  claim: EvidenceClaim,
  opts?: { maxDocuments?: number; candidates?: EvidenceCandidate[] },
): Promise<EvidenceMatchResult> {
  const empty: EvidenceMatchResult = { suggestions: [], confidentDocumentIds: [], uncertainDocumentIds: [] };

  try {
    const docs: EvidenceCandidate[] =
      opts?.candidates ?? ((await listDocuments(ctx, propertyId)) as EvidenceCandidate[]);

    // Only documents with derived text can be judged. A document whose summary has not been
    // generated yet is not evidence-absent — it is simply not yet readable.
    const readable = docs.filter((d) => d.aiSummary && d.aiSummary.trim().length > 0);
    if (readable.length === 0) return empty;

    const max = opts?.maxDocuments ?? 20;
    const candidates = readable.slice(0, max);
    // ponytail: silent cap. A property with >max documents only considers the newest `max`;
    // surface it if the UI ever shows "N documents were not considered".
    if (readable.length > max) {
      console.warn(`[evidence] capped at ${max} of ${readable.length} documents`);
    }

    const answers = await Promise.all(
      candidates.map(async (doc) => {
        const res = await decide(
          {
            property: { claim: claim.claim },
            document: { name: doc.name, summary: excerpt(doc.aiSummary as string) },
          },
          {
            evidences_claim: {
              type: "noul",
              instructions:
                `Does this document evidence the following claim about the property?\n` +
                `Claim: ${claim.claim}\n` +
                `A document is evidence only if it independently mentions facts that support the ` +
                `claim. ${claim.criterion} A document about a different property, or one that ` +
                `merely fails to contradict the claim, is NOT evidence.`,
            },
          },
        );
        const answer = res?.evidences_claim;
        if (!answer || answer.type !== "noul") return null;
        return { doc, noul: answer.noul };
      }),
    );

    const suggestions: EvidenceSuggestion[] = answers
      .filter((a): a is { doc: EvidenceCandidate; noul: number } => a !== null)
      .map((a) => ({ documentId: a.doc.id, documentName: a.doc.name, noul: a.noul }))
      .sort((a, b) => b.noul - a.noul); // best first — ranking is the product value

    return {
      suggestions,
      confidentDocumentIds: suggestions.filter((s) => s.noul >= MAX_NOUL).map((s) => s.documentId),
      uncertainDocumentIds: suggestions
        .filter((s) => s.noul >= MIN_NOUL && s.noul < MAX_NOUL)
        .map((s) => s.documentId),
    };
  } catch (err) {
    // Advisory path: never break the unlock wizard over a suggestion failure.
    console.warn("[evidence] suggestEvidence failed", err);
    return empty;
  }
}

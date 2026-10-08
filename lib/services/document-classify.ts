import "server-only";
import { documentCategoryEnum } from "@/lib/db/schema";
import { decide } from "@/lib/services/jev";
import { log } from "@/lib/log";

// Document category triage via Jev.
//
// `documents.category` is a real enum (Title | Rental | Photos | Legal | Financial | Estate | Other)
// that nothing has ever populated: the only writer in the codebase is a hardcoded "Photos" on the
// photo path, so every uploaded document carries category = null.
//
// This fills it. The caller already has the document text in hand (the summarize route downloads the
// file bytes before its own model call), so the state here is a DIGEST, never the file: Jev is billed
// per input token, and category is a decision about kind, not content.
//
// Why Jev and not the frontier model already in the request: that model pays fresh (uncached) input
// rates for the whole file. Jev pays $0.042/M on a few hundred tokens of digest. On a per-request
// route that sees each document once and never reuses a prompt prefix, that is 50-200x cheaper.
//
// Advisory by design: `decide()` returns null on any failure (no key, 401/402/403/502, timeout,
// malformed payload), and so does this — the caller writes nothing and the category stays null,
// exactly as it is today. A Jev outage costs a category, never a document.

/** The categories Jev may return — read from the DB enum so the question's criteria and the
 *  column cannot drift. Adding a category to the schema makes it selectable; the test asserts
 *  this list matches the enum at runtime. */
export const DOCUMENT_CATEGORIES = documentCategoryEnum.enumValues;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

// One description per option. This is the "prompt engineering" the guidance talks about: the
// criteria ARE the model's instructions, so each line states what the category means in this
// domain and what distinguishes it from the neighbours it is confusable with.
const CRITERIA: Record<DocumentCategory, string> = {
  Title:
    "Title deed, land certificate, cadastral or ownership document proving who owns the property",
  Rental:
    "Lease, tenancy agreement, rent schedule, or tenant correspondence",
  Photos: "A photograph or image, not a written document",
  Legal:
    "Contract, power of attorney, court filing, or legal notice not covered by the other types",
  Financial:
    "Invoice, receipt, bank statement, tax document, or mortgage statement about money",
  Estate:
    "Estate agent listing, valuation report, or agency brochure",
  Other: "None of the above, or too little text to tell",
};

/**
 * Classify a document's category from a short text digest.
 *
 * Returns the category, or null when Jev is unavailable or the answer is not one of the known
 * categories. Never throws — the caller must treat null as "leave it unset".
 *
 * `digest` should be the document's text (or its summary), NOT raw file bytes and NOT tenant PII.
 */
export async function classifyDocument(
  digest: string,
  fileName?: string,
): Promise<DocumentCategory | null> {
  const state = fileName ? { fileName, text: digest } : { text: digest };

  const result = await decide(state, {
    category: {
      type: "choice",
      instructions: "What kind of property document is this?",
      criteria: CRITERIA,
    },
  });

  if (!result) return null;

  const answer = result.category;
  if (answer.type !== "choice") return null;

  // Jev may only return a declared option, but the response is untrusted wire data: a value
  // outside the enum must become null, not an invalid DB write.
  const choice = answer.choice as DocumentCategory;
  if (!DOCUMENT_CATEGORIES.includes(choice)) {
    log.warn("documents.classify.unknown_category", { choice: answer.choice });
    return null;
  }

  return choice;
}

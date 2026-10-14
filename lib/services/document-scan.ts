import "server-only";
import { z } from "zod";
import { generateObject, type LanguageModel } from "ai";
import { documentModel, scanModelSlug } from "./ai-model";
import { reconcileExtractions, type ScanResult } from "./reconcile-extractions";

// The property details we ask the model to pull out of a scanned document. Every field is nullable —
// the model returns null for anything the document does not state, so we never carry a guessed value.
// propertyType and status are enums of the wizard's allowed values, so the model returns a canonical
// value (or null) with no post-hoc normalization. Everything else is a raw string cleaned later by the
// wizard's own parsers on submit.
const propertyTypeEnum = z.enum([
  "residential", "commercial", "multi-unit", "retail", "land", "industrial", "construction", "other",
]);
const statusEnum = z.enum(["Rented", "Vacant", "Owner-Occupied"]);

export const ExtractedPropertySchema = z.object({
  propertyName: z.string().nullable().describe("A short name/label for the property, or its street address if unnamed"),
  propertyType: propertyTypeEnum.nullable().describe("Best-fit property type, or null if unclear"),
  status: statusEnum.nullable().describe("Occupancy status if stated, else null"),
  addressLine: z.string().nullable().describe("Street address / first address line"),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable().describe("Province / state / region"),
  zip: z.string().nullable().describe("Postal / ZIP code"),
  country: z.string().nullable(),
  yearBuilt: z.string().nullable(),
  totalArea: z.string().nullable().describe("Total area as a number (square meters), digits only"),
  bedrooms: z.string().nullable(),
  bathrooms: z.string().nullable(),
  parkingSpaces: z.string().nullable(),
  purchasePrice: z.string().nullable().describe("Purchase / sale price if stated"),
  currentMarketValue: z.string().nullable().describe("Current market / assessed value if stated"),
  purchaseDate: z.string().nullable().describe("Purchase date in YYYY-MM-DD if stated"),
  ownershipStatus: z.string().nullable().describe("Ownership arrangement if stated (e.g. owned, leased)"),
});

export type ExtractedProperty = z.infer<typeof ExtractedPropertySchema>;

const EXTRACTION_PROMPT = [
  "This is a property document — a title deed, lease, listing, sale agreement, invoice, or similar.",
  "Extract the property's details into the given fields.",
  "Translate any non-English text (for example Khmer) into English.",
  "Return null for any field the document does not clearly state — do NOT guess or infer a value,",
  "and NEVER use a placeholder like \"Unknown\", \"N/A\", or \"-\"; use null instead.",
  "For numeric fields (total area, prices, bedroom/bathroom/parking counts, year) return digits only —",
  "no units, currency symbols, or thousands separators (e.g. \"2000\", not \"2,000 sq m\").",
].join(" ");

// The scan model is swappable via the SCAN_MODEL env var so we can pick the best one empirically
// without touching the extraction code. Provider selection (Anthropic / OpenRouter / OpenAI) and the
// default live in lib/services/ai-model.ts, shared with the summary and translation jobs so the three
// document readers cannot drift apart. generateObject + the schema stay identical across models.
function scanModel(): LanguageModel {
  return documentModel(scanModelSlug());
}

// How many times we run the extraction and reconcile (see reconcile-extractions.ts). 3 gives a real
// majority vote so unstable handwritten numerals get caught and flagged instead of silently kept.
// Scans are rare, so 3× a cents-scale call is still cents. Overridable via SCAN_SAMPLES.
const DEFAULT_SCAN_SAMPLES = 3;

// One extraction pass: hand the raw file to the model (it reads PDFs and images directly, no separate
// OCR step, and translates inline) and get back a validated ExtractedProperty. generateObject throws
// if the model output doesn't match the schema, so callers never parse free-form text.
async function extractOnce(
  model: LanguageModel,
  fileBytes: Uint8Array,
  mimeType: string,
): Promise<ExtractedProperty> {
  const { object } = await generateObject({
    model,
    schema: ExtractedPropertySchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: EXTRACTION_PROMPT },
          { type: "file", data: fileBytes, mediaType: mimeType },
        ],
      },
    ],
  });
  return object;
}

// Self-consistency scan: run the extraction N times in parallel and reconcile the runs into one
// result. Fields the runs agree on are kept as-is; fields they disagree on keep the majority value and
// are returned in `lowConfidence` so the wizard can ask the user to double-check them (AI drafts,
// human confirms). Running in parallel means the wall-clock cost is ~one call, not N.
export async function scanDocument(fileBytes: Uint8Array, mimeType: string): Promise<ScanResult> {
  const model = scanModel();
  // Clamp to a sane 1..5 so a fat-fingered env value (0, -1, "abc", 999) can't crash the scan route or
  // fan out an absurd number of calls. NaN/0 fall back to the default via ||.
  const samples = Math.min(5, Math.max(1, Number(process.env.SCAN_SAMPLES) || DEFAULT_SCAN_SAMPLES));

  // The N runs are independent paid calls. The AI SDK raises "AI_APICallError: Invalid JSON response"
  // when the provider's HTTP body isn't JSON at all — seen on staging on an ordinary document while
  // the other two runs returned fine — so it is a transport flake, not a schema mismatch, and JSON
  // repair would not help. Promise.all turned that single flake into a failed scan by discarding the
  // two good extractions with it. Vote on whatever came back instead; only a ballot with no valid
  // runs is a failure, and it surfaces the provider's own error.
  const settled = await Promise.allSettled(
    Array.from({ length: samples }, () => extractOnce(model, fileBytes, mimeType)),
  );
  const runs = settled
    .filter((outcome): outcome is PromiseFulfilledResult<ExtractedProperty> => outcome.status === "fulfilled")
    .map((outcome) => outcome.value);

  if (runs.length === 0) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }
  // A single surviving run cannot be voted on, so nothing would look uncertain and the draft would
  // present as verified when it never was. Flag every field for review in that case.
  // ponytail: whole-record flag, not per-field confidence; split it if a one-run scan turns out to be common.
  if (runs.length === 1) {
    const reconciled = reconcileExtractions(runs);
    return {
      extracted: reconciled.extracted,
      lowConfidence: Object.keys(reconciled.extracted) as (keyof ExtractedProperty)[],
    };
  }
  return reconcileExtractions(runs);
}

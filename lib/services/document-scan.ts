import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

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

// One model call: hand the raw file to gpt-4o-mini (it reads PDFs and images directly, no separate
// OCR step, and translates inline) and get back a validated ExtractedProperty. generateObject throws
// if the model output doesn't match the schema, so callers never parse free-form text.
export async function scanDocument(fileBytes: Uint8Array, mimeType: string): Promise<ExtractedProperty> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
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

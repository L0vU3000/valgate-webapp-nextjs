import type { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { documentAiConfigured, documentModel, summaryModelSlug } from "@/lib/services/ai-model";
import { resolveRouteCtx } from "@/lib/auth/ctx";
import { scanDocument } from "@/lib/services/document-scan";
import { getProperty } from "@/lib/services/properties";
import { suggestPropertyUpdates } from "@/lib/services/property-suggestions";
import {
  getDocument,
  setDocumentAiStatus,
  setDocumentCategory,
  saveDocumentSummary,
  setDocumentSuggestions,
} from "@/lib/services/documents";
import { classifyDocument } from "@/lib/services/document-classify";
import { resolveDocumentUrl } from "@/lib/services/storage";
import { documentAiLimiter, allowed } from "@/lib/ratelimit";
import { log } from "@/lib/log";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";

export const runtime = "nodejs"; // S3 + Neon need the Node runtime (not Edge)
export const maxDuration = 60;   // give the model time to read the whole file

// The shape we ask the model to return. generateObject validates the model output against this
// Zod schema, so we never parse free-form text — `object` is already the right shape or it throws.
const SummarySchema = z.object({
  summary: z.string().describe("2-4 plain sentences: what this document is and says"),
  keyFields: z.array(z.object({ label: z.string(), value: z.string() })),
  pageCount: z.number().int().nonnegative(),
});

// Translation output. Structured for the same reason as the summary: never parse free-form text.
const TranslationSchema = z.object({
  detectedLanguage: z.string().describe("the language the document is written in"),
  translation: z.string().describe("the document's text, translated into English, in full"),
});

// Optional body. Absent = summarize, which is what the Summary tab sends today.
// `refresh` re-reads a document whose suggestions are already stored. Without it, a suggest request
// answers from the row, so viewing a document never bills twice for the same answer.
const BodySchema = z.object({
  mode: z.enum(["summary", "translate", "suggest"]).optional(),
  refresh: z.boolean().optional(),
});

/**
 * Checks that the path document id is a non-empty string after trimming.
 * Returns the cleaned id, or null when the value is missing/blank so the
 * handler can answer 400 without hitting the database.
 */
function parseDocumentId(raw: string): string | null {
  const parsed = z.string().trim().min(1).safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

// POST /api/documents/[id]/summarize
//
// Generates an AI summary for a single document, ON CLICK ONLY. The whole job runs inside this
// one request: authorize → read the file from storage → ask the model → store the result on the
// document row. Because it is stored, the model runs once; every later page view just reads the row.
//
// Authorization: resolveRouteCtx() identifies the caller's org (JSON 401 if unsigned-in);
// getDocument() is org-scoped, so a document belonging to another org returns null and we
// answer 404 (no IDOR, no info leak).
//
// What can go wrong (all handled): missing session → 401; blank id → 400; missing/other-org
// document → 404; the file fetch or the model call can fail or time out — the try/catch logs
// the real error server-side, flips ai_status to "failed", and returns a generic message.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveRouteCtx();
  if (!authResult.ok) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const ctx = authResult.ctx;

  // The body picks the job: absent = summarize. The Translate tab sends { mode: "translate" }.
  // It rides this route because the route already owns everything the job needs — the session,
  // the paid-model rate limit, the org-scoped ownership check and the file download — and a
  // second route would duplicate all of it to differ only in the prompt.
  const body = await req.json().catch(() => ({}));
  const parsedBody = BodySchema.safeParse(body);
  const translating = parsedBody.success && parsedBody.data.mode === "translate";
  // `suggest` reads the same file with the property's own schema and reports where the two
  // disagree. It is a comparison, not a summary: it writes NOTHING, so it must not touch ai_status.
  const suggesting = parsedBody.success && parsedBody.data.mode === "suggest";
  // "Read it again" — the only way to spend a model call on a list that has already been read.
  const refresh = parsedBody.success && parsedBody.data.refresh === true;

  // TM1-64: paid-model edge — its own 20/min budget, separate from document INGEST (which is the
  // costlier, multi-pass edge). Gated after auth so unauthenticated callers never consume quota, and
  // before the file download / model call.
  if (!(await allowed(documentAiLimiter, ctx.userId))) {
    log.warn("ratelimit.block", { edge: "documentSummarize", userId: ctx.userId });
    return Response.json(
      { ok: false, error: "Too many requests. Please try again in a moment." },
      { status: 429 },
    );
  }

  const { id: rawId } = await params; // Next.js 15: params is a Promise — always await it
  const id = parseDocumentId(rawId);
  if (!id) {
    return Response.json({ ok: false, error: "Invalid document id." }, { status: 400 });
  }

  // Ownership check: org-scoped lookup. Another org's id (or a missing id) returns null.
  const doc = await getDocument(ctx, id);
  if (!doc) {
    return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Is a document model configured at all? Asked of the same rule that picks the provider, so a
  // deployment running on OpenRouter alone is not mistaken for an unconfigured one. An upload fires
  // this route automatically, so a missing key is a config state, not a failure: answer 503 and leave
  // ai_status alone (see lib/services/ai-model.ts).
  if (!documentAiConfigured()) {
    return Response.json(
      { ok: false, error: "AI summaries are not configured." },
      { status: 503 },
    );
  }

  // Flip to "generating" first so a reload during the model call shows the spinner, not the
  // idle button. The Summary tab reads ai_status to decide which of its four states to render.
  // Translation is not a summary: it has its own local state and must not touch ai_status, or a
  // translation would leave the Summary tab stuck on a spinner (or worse, on "failed").
  if (!translating && !suggesting) await setDocumentAiStatus(ctx, id, "generating");

  try {
    // Resolve a short-lived URL for the stored file, then download its bytes so we can hand the
    // raw file straight to the model (gpt-4o-mini accepts PDF and image inputs — no OCR step).
    const fileUrl = await resolveDocumentUrl(doc.storageId);
    const response = await fetch(fileUrl);
    const fileBytes = new Uint8Array(await response.arrayBuffer());

    if (suggesting) {
      // Already read: recall it. The list is stored on the row when it is first produced, because
      // reading a document is the expensive part and the answer does not change by being asked for
      // again — and because the user's decisions live in that same list. An absent list means "never
      // read against the property"; an EMPTY list is a real answer ("it agrees") and is recalled too.
      if (doc.aiSuggestions && !refresh) {
        return Response.json({ ok: true, mode: "suggest", suggestions: doc.aiSuggestions, cached: true });
      }
      // Same file, the scan schema instead of the summary schema: what a NEW property would be
      // created from. The comparison against the existing property is the pure, unit-tested part
      // (lib/services/property-suggestions.ts) — the model's job ends at reading the document.
      const { extracted } = await scanDocument(fileBytes, doc.mimeType ?? "application/pdf");
      const property = await getProperty(ctx, doc.propertyId);
      const suggestions = property ? suggestPropertyUpdates(property, extracted) : [];
      await setDocumentSuggestions(ctx, id, suggestions);
      // The list is a read-through cache (lib/data/cached-reads.ts, tag "documents"). Writing the row
      // without dropping it means the page keeps serving the document as it was BEFORE the read —
      // which is exactly how a saved summary looks like it was never generated.
      revalidateFeTag("documents");
      await bustCache("documents");
      return Response.json({ ok: true, mode: "suggest", suggestions, cached: false });
    }

    if (translating) {
      // Numbers, names and land references are what a title document is FOR, so they are pinned
      // rather than left to the model's judgement about how a figure should read in English.
      const { object } = await generateObject({
        model: documentModel(summaryModelSlug()),
        schema: TranslationSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Translate this property document into English. Keep every name, number, date, " +
                  "parcel reference and unit exactly as written — do not convert units or round. " +
                  "Keep the reading order of the original.",
              },
              { type: "file", data: fileBytes, mediaType: doc.mimeType ?? "application/pdf" },
            ],
          },
        ],
      });
      return Response.json({
        ok: true,
        mode: "translate",
        detectedLanguage: object.detectedLanguage,
        translation: object.translation,
      });
    }

    // One model call. The file part carries the document bytes; generateObject returns `object`
    // already validated against SummarySchema.
    const { object } = await generateObject({
      model: documentModel(summaryModelSlug()), // cheap mini-class reader; file input + structured output
      schema: SummarySchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Summarize this property document and extract its key fields." },
            { type: "file", data: fileBytes, mediaType: doc.mimeType ?? "application/pdf" },
          ],
        },
      ],
    });

    // Store the result and mark it ready in a single write.
    await saveDocumentSummary(ctx, id, { ...object, status: "ready" });
    revalidateFeTag("documents");
    await bustCache("documents");

    // Fill `documents.category`, which nothing has ever populated. Advisory: a null return (no
    // key, Jev outage, unrecognised choice) writes nothing — the category simply stays null, as
    // it is today. Deliberately after the summary write so a triage failure can never lose the
    // summary the user actually asked for. Digest is the model's own summary, not the file.
    const category = await classifyDocument(object.summary, doc.name);
    if (category) {
      await setDocumentCategory(ctx, id, category);
    }

    return Response.json({ ok: true, summary: object, category });
  } catch (err) {
    // Never leak internals to the client: log the real error, return a generic message, and leave
    // the row in "failed" so the Summary tab shows the error state with a working Retry button.
    // A failed translation or comparison writes nothing at all — the tab shows its own error and can
    // retry. Only a failed SUMMARY flips ai_status, because only the Summary tab reads it.
    log.error(
      translating
        ? "documents.translate.failed"
        : suggesting
          ? "documents.suggest.failed"
          : "documents.summarize.failed",
      err,
      { id },
    );
    if (!translating && !suggesting) await setDocumentAiStatus(ctx, id, "failed");
    return Response.json(
      {
        ok: false,
        error: translating
          ? "Could not translate this document."
          : suggesting
            ? "Could not read this document against the property."
            : "Could not summarize this document.",
      },
      { status: 500 },
    );
  }
}

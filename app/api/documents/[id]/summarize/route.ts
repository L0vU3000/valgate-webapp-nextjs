import type { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { resolveRouteCtx } from "@/lib/auth/ctx";
import { getDocument, setDocumentAiStatus, saveDocumentSummary } from "@/lib/services/documents";
import { resolveDocumentUrl } from "@/lib/services/storage";
import { aiLimiter, allowed } from "@/lib/ratelimit";
import { log } from "@/lib/log";

export const runtime = "nodejs"; // S3 + Neon need the Node runtime (not Edge)
export const maxDuration = 60;   // give the model time to read the whole file

// The shape we ask the model to return. generateObject validates the model output against this
// Zod schema, so we never parse free-form text — `object` is already the right shape or it throws.
const SummarySchema = z.object({
  summary: z.string().describe("2-4 plain sentences: what this document is and says"),
  keyFields: z.array(z.object({ label: z.string(), value: z.string() })),
  pageCount: z.number().int().nonnegative(),
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
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveRouteCtx();
  if (!authResult.ok) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const ctx = authResult.ctx;

  // TM1-64: paid-model edge — same 10/min budget as document scan. Gated after auth so
  // unauthenticated callers never consume quota, and before the file download / model call.
  if (!(await allowed(aiLimiter, ctx.userId))) {
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

  // Flip to "generating" first so a reload during the model call shows the spinner, not the
  // idle button. The Summary tab reads ai_status to decide which of its four states to render.
  await setDocumentAiStatus(ctx, id, "generating");

  try {
    // Resolve a short-lived URL for the stored file, then download its bytes so we can hand the
    // raw file straight to the model (gpt-4o-mini accepts PDF and image inputs — no OCR step).
    const fileUrl = await resolveDocumentUrl(doc.storageId);
    const response = await fetch(fileUrl);
    const fileBytes = new Uint8Array(await response.arrayBuffer());

    // One model call. The file part carries the document bytes; generateObject returns `object`
    // already validated against SummarySchema.
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"), // cheap OpenAI mini, file input + structured output
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
    return Response.json({ ok: true, summary: object });
  } catch (err) {
    // Never leak internals to the client: log the real error, return a generic message, and leave
    // the row in "failed" so the Summary tab shows the error state with a working Retry button.
    log.error("documents.summarize.failed", err, { id });
    await setDocumentAiStatus(ctx, id, "failed");
    return Response.json({ ok: false, error: "Could not summarize this document." }, { status: 500 });
  }
}

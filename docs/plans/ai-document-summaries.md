# Phase 2 — Real AI document summaries

**Plan:** `plan-17ebdccb34444429` ·
https://plan.agent-native.com/plans/plan-17ebdccb34444429

**Status:** 🟢 approved (decisions locked, ready to execute). Mirror of the hosted visual
plan. Follows [document-detail-revamp.md](./document-detail-revamp.md) (Phase 1, shipped).

---

## Objective

Make the Phase 1 **Generate summary** button real. On click, the server reads the
document, asks a cheap OpenAI **mini** model for a plain-language summary + extracted key
fields, **stores the result on the document row**, and the Summary tab renders it. Because
it's stored, the model runs once — every later view just reads the row. This is the only
part of the documents revamp that touches the database or AI.

## Locked decisions (2026-06-29)

1. **Click-triggered only** — runs when the user clicks. Nothing runs on upload.
2. **Generated once, stored** — never recomputed on each page load.
3. **Tabbed rail** (Details | Summary) — carried over from Phase 1.
4. **Model — `gpt-4o-mini`** (OpenAI cheap mini) via the already-installed `@ai-sdk/openai`
   provider: cheapest mini at ~$0.15 / $0.60 per 1M tokens, with file input + structured
   outputs. Upgrade to `gpt-4.1-mini` (1M context, stronger) only if documents are large
   or extraction quality is weak.
5. **Execution — inside the click request** (60s budget, spinner). Background job deferred.
6. **Key fields — generic `[{ label, value }]` list**; the model picks the most relevant
   fields per document. No per-category code.

> ⚠️ **Caveat:** OpenAI mini models are weaker than Claude on **scanned** image-only PDFs.
> They handle digital PDFs and images well. Upgrade path if scanned deeds come out poorly:
> `gpt-4.1-mini`, or send the pages as images — model swap only, no architecture change.

## The stack — no new dependencies

Already in `package.json` (verified): **`ai` v6** + **`@ai-sdk/openai` v3** (and
`@ai-sdk/anthropic` v3, unused here) + `zod`. The Vercel AI SDK makes the provider a
one-line choice — `openai(…)` instead of `anthropic(…)`.

| Need | Already installed | Use |
|---|---|---|
| Call the model | `@ai-sdk/openai` v3 | `openai('gpt-4o-mini')` |
| Structured result | `ai` v6 | `generateObject({ schema })` |
| Validate the shape | `zod` | `SummarySchema` |
| Read the file | `resolveDocumentUrl` (storage.ts) | fetch S3 bytes → hand to the model |

`generateObject` returns data already validated to a Zod schema — no fragile parsing of
the model's text.

## How it works (the flow)

```
Click "Generate summary"
  → POST /api/documents/[id]/summarize   (requireCtx + org-scoped ownership)
  → fetch file bytes from S3             (resolveDocumentUrl)
  → model reads the file                 (generateObject → summary + key fields)
  → save on documents row                (ai_summary, ai_key_fields, ai_status='ready')
  → Summary tab renders the stored result
```

One request does the whole job; the model runs once.

## Schema — 4 new nullable columns on `documents`

Nullable = existing documents keep working with no summary; no backfill.

| Column | Type | Note |
|---|---|---|
| `ai_status` | text | `null \| generating \| ready \| failed` — drives the rail state |
| `ai_summary` | text | the generated summary |
| `ai_key_fields` | jsonb | `[{ label, value }]` extracted from the doc |
| `page_count` | bigint | real page count (replaces the old hardcoded `4`) |

```ts
// lib/db/schema/documents.ts — add to the documents pgTable
aiStatus: text("ai_status"),            // null | "generating" | "ready" | "failed"
aiSummary: text("ai_summary"),          // the generated summary text
aiKeyFields: jsonb("ai_key_fields"),    // [{ label, value }] | null
pageCount: bigint("page_count", { mode: "number" }),
```
Then `npm run db:generate` → `db:migrate`.

## The core new file — the summarize route

Same route-handler pattern as `app/api/cron/cleanup-drafts/route.ts`. The **only** place
the model is called.

```ts
// app/api/documents/[id]/summarize/route.ts (new)
import type { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { requireCtx } from "@/lib/auth/ctx";
import { getDocument, setDocumentAiStatus, saveDocumentSummary } from "@/lib/services/documents";
import { resolveDocumentUrl } from "@/lib/services/storage";
import { log } from "@/lib/log";

export const runtime = "nodejs";   // S3 + Neon need Node
export const maxDuration = 60;     // give the model time to read the file

const SummarySchema = z.object({
  summary: z.string().describe("2-4 plain sentences: what this document is and says"),
  keyFields: z.array(z.object({ label: z.string(), value: z.string() })),
  pageCount: z.number().int().nonnegative(),
});

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;          // Next 15: params is a Promise
  const ctx = await requireCtx();

  // Ownership: getDocument is org-scoped → another org's id returns null (no IDOR).
  const doc = await getDocument(ctx, id);
  if (!doc) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

  await setDocumentAiStatus(ctx, id, "generating");  // reload-safe spinner

  try {
    const fileUrl = await resolveDocumentUrl(doc.storageId);
    const fileBytes = new Uint8Array(await (await fetch(fileUrl)).arrayBuffer());

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),                  // cheap OpenAI mini
      schema: SummarySchema,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Summarize this property document and extract its key fields." },
          { type: "file", data: fileBytes, mediaType: doc.mimeType ?? "application/pdf" },
        ],
      }],
    });

    await saveDocumentSummary(ctx, id, { ...object, status: "ready" });
    return Response.json({ ok: true, summary: object });
  } catch (err) {
    log.error("documents.summarize.failed", { id });   // never leak internals
    await setDocumentAiStatus(ctx, id, "failed");
    return Response.json({ ok: false, error: "Could not summarize this document." }, { status: 500 });
  }
}
```

Two new service writers in `lib/services/documents.ts` — `setDocumentAiStatus` and
`saveDocumentSummary` (org-scoped, commented, with error handling). `getDocument`
already exists from Phase 1.

## Reading the file (beginner note)

You pass the file bytes straight to the model — `gpt-4o-mini` accepts PDF and image
inputs, so a digital PDF or a photo works without a separate parsing step. No OCR or
PDF-parsing library. Caveat (above): minis are weaker on scanned/image-only PDFs.

## Known ceiling (deliberate simplification)

The summary runs **inside the button's request** (simplest to build) with a 60s function
budget — fine for normal property documents. A very large/slow document could hit the
limit and land in `failed` (Retry works). Upgrade path if common: move the **model call**
to a background job and have the rail poll `ai_status` — **no schema change needed**, since
`ai_status` already models `generating`. Not built now.

## Build steps

1. Add the 4 nullable columns to `documents.ts`; `db:generate` + `db:migrate`.
2. Add `setDocumentAiStatus` + `saveDocumentSummary` to `lib/services/documents.ts`.
3. Create `app/api/documents/[id]/summarize/route.ts` (code above).
4. Wire the button: POST to the route; show `generating → ready/failed`.
5. Render the 4 `ai_status` states in the Summary tab (idle / generating / ready / failed+Retry).
6. Replace the hardcoded page count with the real `page_count`.

## Files this touches

- `lib/db/schema/documents.ts` — add 4 nullable columns
- `drizzle/` — generated migration (ALTER TABLE)
- `lib/services/documents.ts` — `setDocumentAiStatus` + `saveDocumentSummary`
- `app/api/documents/[id]/summarize/route.ts` — new; only place the model is called
- `components/property/DocumentDetailView.tsx` — button calls route; renders 4 states + real page count

## Verification (when built)

- `npx tsc --noEmit` → exit 0.
- `OPENAI_API_KEY` set in env (Vercel + local). `db:generate` produces a clean ALTER-TABLE
  migration; `db:migrate` applies it.
- Click generates a real summary; reload shows the stored result (no second model call);
  a forced error lands in `failed` with a working Retry.

> The interactive canvas (4 Summary-tab states: idle / generating / ready / failed) lives
> in the hosted plan — open the URL above.

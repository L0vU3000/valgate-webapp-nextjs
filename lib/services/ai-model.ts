import "server-only";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { env } from "@/lib/env";
import type { LanguageModel } from "ai";

/**
 * Which model reads a property document.
 *
 * One place, because three jobs read documents — extraction, summary, translation — and they must
 * not drift into three providers. The provider is inferred from the slug, so swapping models is an
 * env change and nothing else:
 *
 *   "claude-*"     → Anthropic  (ANTHROPIC_API_KEY)
 *   "vendor/model" → OpenRouter (OPENROUTER_API_KEY) — Gemini and everything else it hosts
 *   anything else  → OpenAI     (OPENAI_API_KEY)
 *
 * OpenRouter is the cost lever. Measured on a real 4-page PDF: google/gemini-2.5-flash read it,
 * file part and all, for $0.0004. Extraction runs the model three times per document for the
 * self-consistency vote, so that is $0.0012 a document rather than three frontier-model calls.
 */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Gemini Flash through OpenRouter: cheap, reads PDFs and images directly, structured output. */
export const GEMINI_DOCUMENT_MODEL = "google/gemini-2.5-flash";

export function documentModel(slug: string): LanguageModel {
  if (slug.startsWith("claude")) return anthropic(slug);
  if (slug.includes("/")) {
    // A `vendor/model` slug is OpenRouter's form. Saying so beats falling back to OpenAI, which
    // would fail on an unknown model name and look like a bad slug rather than a missing key.
    if (!env.OPENROUTER_API_KEY) {
      throw new Error(`OPENROUTER_API_KEY is required to use the model "${slug}".`);
    }
    return createOpenAI({ baseURL: OPENROUTER_BASE_URL, apiKey: env.OPENROUTER_API_KEY })(slug);
  }
  return openai(slug);
}

/**
 * The default document reader: Gemini through OpenRouter when that key is configured, otherwise the
 * OpenAI model that won the handwriting bench (the bench ran on OpenAI; nothing has beaten it there
 * yet). Either way an explicit env override wins.
 */
function defaultSlug(): string {
  return env.OPENROUTER_API_KEY ? GEMINI_DOCUMENT_MODEL : "gpt-5.6-terra";
}

/** The extraction model. `SCAN_MODEL` overrides, as it always has. */
export function scanModelSlug(): string {
  return process.env.SCAN_MODEL?.trim() || defaultSlug();
}

/** The summary/translation model. `DOC_AI_MODEL` overrides. */
export function summaryModelSlug(): string {
  return process.env.DOC_AI_MODEL?.trim() || defaultSlug();
}

/**
 * Whether the document jobs can run at all, asked of the SAME rule that picks the provider.
 *
 * This exists because the answer is not "is OPENAI_API_KEY set": a deployment can be configured with
 * nothing but OpenRouter, and a guard that hardcoded OpenAI turned that working setup into a 503 on
 * every upload. Keep the two in step — a new provider belongs in both.
 */
export function documentAiConfigured(slug = scanModelSlug()): boolean {
  // Anthropic is not in the env schema (that SDK reads process.env itself), so ask it there — and
  // the answer must match documentModel() above, provider for provider.
  if (slug.startsWith("claude")) return Boolean(process.env.ANTHROPIC_API_KEY);
  if (slug.includes("/")) return Boolean(env.OPENROUTER_API_KEY);
  return Boolean(env.OPENAI_API_KEY);
}

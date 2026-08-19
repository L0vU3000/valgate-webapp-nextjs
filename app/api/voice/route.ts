import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCtx } from "@/lib/auth/ctx";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/voice
//
// Receives locally-transcribed text from the user's device (parrot on Mac,
// WhisperKit on iOS, etc.) and optionally routes it through the LLM.
//
// Audio never hits this endpoint — only text. The STT itself happens 100%
// on-device via whisper.cpp / WhisperKit / parrot.
//
// Modes:
//   "echo"  → just return the text back (testing, clipboard pipeline)
//   "chat"  → send to LLM with a system prompt, return the reply
//
// Auth: Clerk session cookie (browser) or Bearer token (API clients).
const BodySchema = z.object({
  text: z.string().min(1).max(4000),
  mode: z.enum(["echo", "chat"]).default("echo"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid body: text required, mode optional (echo|chat)" },
      { status: 400 }
    );
  }

  const { text, mode } = parsed.data;

  // Auth check — same pattern as every other route
  let ctx;
  try {
    ctx = await requireCtx();
  } catch {
    return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // Echo mode: just bounce the text back. Useful for verifying the pipeline
  // works end-to-end without burning OpenAI tokens.
  if (mode === "echo") {
    return Response.json({ ok: true, mode: "echo", text, userId: ctx.userId });
  }

  // Chat mode: send to LLM with a Valgate-flavoured system prompt.
  try {
    const { text: reply } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "You are Valgate AI, a helpful assistant for a property-management platform. " +
        "Be concise, professional, and actionable. When the user asks about properties, " +
        "documents, or portfolios, assume they mean their own data in the Valgate app.",
      prompt: text,
    });

    return Response.json({
      ok: true,
      mode: "chat",
      text,
      reply,
      userId: ctx.userId,
    });
  } catch (err) {
    log.error("voice.chat.failed", err, { userId: ctx.userId, text: text.slice(0, 100) });
    return Response.json(
      { ok: false, error: "Could not process your request." },
      { status: 500 }
    );
  }
}

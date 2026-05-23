"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as aiSessionsDb from "@/lib/data/db/ai-sessions";
import * as aiMessagesDb from "@/lib/data/db/ai-messages";
import {
  buildAiOverlayContext,
  buildSessionTitle,
  buildWelcomeMessage,
  toClientContext,
  type AiOverlayClientContext,
  type AiOverlayContext,
} from "@/lib/data/derivations/ai-context";
import { generateDeterministicReply } from "@/lib/data/derivations/ai-replies";
import type { AiSession } from "@/lib/data/types/ai-session";
import type { AiMessage } from "@/lib/data/types/ai-message";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AiOverlayBootstrap = {
  context: AiOverlayClientContext;
  sessions: AiSession[];
  activeSessionId: string | null;
  messages: AiMessage[];
};

const pathnameSchema = z.string().min(1);
const sessionIdSchema = z.string().min(1);
const contentSchema = z.string().min(1).max(8000);

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fallbackTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 52) return trimmed;
  const cut = trimmed.slice(0, 52);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "…";
}

async function generateSessionTitle(firstMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackTitle(firstMessage);

  try {
    const [{ generateText }, { openai }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ]);

    const { text } = await generateText({
      model: openai("gpt-5-mini"),
      system: [
        "You generate short, descriptive session titles for a property portfolio management app.",
        "Rules:",
        "- Return ONLY the title. No quotes, no punctuation at the end, no explanation.",
        "- 3 to 6 words maximum.",
        "- Title Case.",
        "- Be specific and informative — e.g. 'Rental Income Overview', 'Occupancy Rate Check', 'Document Review Request'.",
        "- Never use generic titles like 'User Query' or 'New Conversation'.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `Generate a title for a conversation that starts with: "${firstMessage}"`,
        },
      ],
    });

    const title = text.trim().replace(/^["']|["']$/g, "");
    return title || fallbackTitle(firstMessage);
  } catch {
    return fallbackTitle(firstMessage);
  }
}

const SYSTEM_PROMPT = (promptContext: string) => [
  "You are Valgate Intelligence, the friendly AI assistant embedded in Valgate — a property portfolio management platform.",
  "Your role: help property owners understand their full portfolio, retrieve data, analyse performance, and navigate the app.",
  "",
  "Tone and behaviour:",
  "- Be warm, friendly, and conversational. Respond naturally to greetings and small talk.",
  "- After a brief exchange, gently guide toward: 'How can I help you with your portfolio today?'",
  "- Never be robotic or refuse to say hello. A good assistant is personable first.",
  "",
  "Data access:",
  "- You have full access to the user's portfolio data in the context below: all properties (with purchase prices, market values, mortgage details, financials), active leases, tenants and payment status, latest property valuations, recent payments, ownership records, open maintenance items, and documents.",
  "- Use this data to answer questions directly and specifically — e.g. rank properties by value, identify overdue tenants, sum rental income, compare equity across properties.",
  "- Never say you don't have access to data that is present in the context. If you can derive the answer from the context, do so.",
  "- If data is genuinely missing from the context, say so and direct the user to the relevant page in the app.",
  "",
  "When answering:",
  "- Be specific and data-driven. Show actual numbers from the context.",
  "- Keep responses concise and practical. Avoid padding or generic filler.",
  "- Use Markdown formatting (bold, lists, tables where helpful).",
  "- Link to in-app routes when relevant, e.g. [View Property](/property/PROP-0001) or [Rental Page](/property/PROP-0001/rental).",
  "",
  "Context data:",
  promptContext,
].join("\n");

async function generateAssistantReply(
  userMessage: string,
  context: AiOverlayContext,
  history: AiMessage[],
): Promise<{ content: string; artifactDocIds?: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return await generateDeterministicReply(userMessage, context);
  }

  try {
    const [{ generateText }, { openai }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ]);

    const recent = history.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const { text } = await generateText({
      model: openai("gpt-5-mini"),
      system: SYSTEM_PROMPT(context.promptContext),
      messages: [...recent, { role: "user", content: userMessage }],
    });

    return { content: text.trim() || "I couldn't generate a response. Please try again." };
  } catch (err) {
    console.error("[ai-overlay] OpenAI error:", err);
    return await generateDeterministicReply(userMessage, context);
  }
}

export async function getOverlayBootstrap(
  pathname: string,
  activeSessionId?: string | null,
): Promise<ActionResult<AiOverlayBootstrap>> {
  try {
    const parsedPath = pathnameSchema.parse(pathname);
    const userId = getCurrentUserId();
    const context = await buildAiOverlayContext(parsedPath);

    let sessions = await aiSessionsDb.listActive(userId);

    if (sessions.length === 0) {
      const session = await aiSessionsDb.create(userId, {
        title: buildSessionTitle(context),
        contextRoute: parsedPath,
        contextPropertyId: context.propertyId ?? undefined,
        status: "active",
      });
      await aiMessagesDb.create(userId, {
        sessionId: session.id,
        role: "assistant",
        content: buildWelcomeMessage(context),
      });
      sessions = [session];
    }

    const resolvedSessionId =
      activeSessionId && sessions.some((s) => s.id === activeSessionId)
        ? activeSessionId
        : sessions[0]?.id ?? null;

    const messages = resolvedSessionId
      ? await aiMessagesDb.listBySession(userId, resolvedSessionId)
      : [];

    return stripUndefined({
      ok: true as const,
      data: {
        context: toClientContext(context),
        sessions,
        activeSessionId: resolvedSessionId,
        messages,
      },
    });
  } catch (err) {
    console.error("[ai-overlay] bootstrap error:", err);
    return { ok: false, error: "Could not load assistant." };
  }
}

export async function refreshOverlayContext(
  pathname: string,
): Promise<ActionResult<AiOverlayClientContext>> {
  try {
    const parsedPath = pathnameSchema.parse(pathname);
    const context = await buildAiOverlayContext(parsedPath);
    return stripUndefined({
      ok: true as const,
      data: toClientContext(context),
    });
  } catch (err) {
    console.error("[ai-overlay] refreshContext error:", err);
    return { ok: false, error: "Could not refresh context." };
  }
}

export async function createSession(
  pathname: string,
  title?: string,
): Promise<ActionResult<{ session: AiSession; messages: AiMessage[] }>> {
  try {
    const parsedPath = pathnameSchema.parse(pathname);
    const userId = getCurrentUserId();
    const context = await buildAiOverlayContext(parsedPath);

    const session = await aiSessionsDb.create(userId, {
      title: title?.trim() || buildSessionTitle(context),
      contextRoute: parsedPath,
      contextPropertyId: context.propertyId ?? undefined,
      status: "active",
    });

    const welcome = await aiMessagesDb.create(userId, {
      sessionId: session.id,
      role: "assistant",
      content: buildWelcomeMessage(context),
    });

    return stripUndefined({
      ok: true as const,
      data: { session, messages: [welcome] },
    });
  } catch (err) {
    console.error("[ai-overlay] createSession error:", err);
    return { ok: false, error: "Could not create session." };
  }
}

export async function archiveSession(
  sessionId: string,
): Promise<ActionResult<void>> {
  try {
    const id = sessionIdSchema.parse(sessionId);
    const userId = getCurrentUserId();
    const updated = await aiSessionsDb.update(userId, id, { status: "archived" });
    if (!updated) return { ok: false, error: "Session not found." };
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[ai-overlay] archiveSession error:", err);
    return { ok: false, error: "Could not archive session." };
  }
}

export async function loadSessionMessages(
  sessionId: string,
): Promise<ActionResult<AiMessage[]>> {
  try {
    const id = sessionIdSchema.parse(sessionId);
    const userId = getCurrentUserId();
    const session = await aiSessionsDb.get(userId, id);
    if (!session || session.status !== "active") {
      return { ok: false, error: "Session not found." };
    }
    const messages = await aiMessagesDb.listBySession(userId, id);
    return stripUndefined({ ok: true as const, data: messages });
  } catch (err) {
    console.error("[ai-overlay] loadSessionMessages error:", err);
    return { ok: false, error: "Could not load messages." };
  }
}

export async function sendMessage(input: {
  sessionId: string;
  content: string;
  pathname: string;
}): Promise<ActionResult<{ messages: AiMessage[]; updatedSessionTitle?: string }>> {
  try {
    const sessionId = sessionIdSchema.parse(input.sessionId);
    const content = contentSchema.parse(input.content.trim());
    const pathname = pathnameSchema.parse(input.pathname);
    const userId = getCurrentUserId();

    const session = await aiSessionsDb.get(userId, sessionId);
    if (!session || session.status !== "active") {
      return { ok: false, error: "Session not found." };
    }

    const context = await buildAiOverlayContext(pathname);
    const history = await aiMessagesDb.listBySession(userId, sessionId);

    // If this is the first user message, set the session title from the message content
    const isFirstUserMessage = !history.some((m) => m.role === "user");
    let updatedSessionTitle: string | undefined;
    if (isFirstUserMessage) {
      updatedSessionTitle = await generateSessionTitle(content);
      await aiSessionsDb.update(userId, sessionId, {
        title: updatedSessionTitle,
        updatedAt: Date.now(),
      });
    }

    await aiMessagesDb.create(userId, {
      sessionId,
      role: "user",
      content,
    });

    const reply = await generateAssistantReply(content, context, history);

    await aiMessagesDb.create(userId, {
      sessionId,
      role: "assistant",
      content: reply.content,
      artifactDocIds: reply.artifactDocIds,
    });

    if (!updatedSessionTitle) {
      await aiSessionsDb.update(userId, sessionId, { updatedAt: Date.now() });
    }

    const messages = await aiMessagesDb.listBySession(userId, sessionId);
    return stripUndefined({ ok: true as const, data: { messages, updatedSessionTitle } });
  } catch (err) {
    console.error("[ai-overlay] sendMessage error:", err);
    return { ok: false, error: "Could not send message." };
  }
}

"use server";

import { z } from "zod";
import { requireCtx } from "@/lib/auth/ctx";
import {
  listAiSessions,
  getAiSession,
  createAiSession,
  updateAiSession,
} from "@/lib/services/ai-sessions";
import {
  listAiMessages,
  getAiMessage,
  createAiMessage,
  updateAiMessage,
} from "@/lib/services/ai-messages";
import {
  buildAiOverlayContext,
  buildSessionTitle,
  buildWelcomeMessage,
  toClientContext,
  type AiOverlayClientContext,
  type AiOverlayContext,
} from "@/lib/data/derivations/ai-context";
import { generateDeterministicReply } from "@/lib/data/derivations/ai-replies";
import {
  PRO_TOOLS,
  CONSUMER_TOOLS,
  toolSummaryLabel,
} from "@/lib/actions/ai-tools";
import { VALGATE_TOOLS, audit } from "@/mcp-server/tool-defs";
import type { AiSession } from "@/lib/data/types/ai-session";
import type { AiMessage, AiMessageStep, AiProposedAction } from "@/lib/data/types/ai-message";
import { isToolStepSuccessful, surfaceKey } from "@/lib/actions/ai-overlay-utils";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AiOverlayAgentMode = "full" | "basic";

export type AiOverlayBootstrap = {
  context: AiOverlayClientContext;
  sessions: AiSession[];
  activeSessionId: string | null;
  messages: AiMessage[];
  agentMode: AiOverlayAgentMode;
};

const pathnameSchema = z.string().min(1);
const sessionIdSchema = z.string().min(1);
const messageIdSchema = z.string().min(1);
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

// ---------------------------------------------------------------------------
// Title generation — unchanged from original; falls back to a slug.
// ---------------------------------------------------------------------------

async function generateSessionTitle(firstMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackTitle(firstMessage);

  try {
    const [{ generateText }, { openai }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ]);

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
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

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = (promptContext: string, isPro: boolean) =>
  [
    "You are Valgate Intelligence, the friendly AI assistant embedded in Valgate — a property portfolio management platform.",
    "Your role: help property owners understand their full portfolio, retrieve data, analyse performance, and navigate the app.",
    "",
    "Tone and behaviour:",
    "- Be warm, friendly, and conversational. Respond naturally to greetings and small talk.",
    "- After a brief exchange, gently guide toward: 'How can I help you with your portfolio today?'",
    "- Never be robotic or refuse to say hello. A good assistant is personable first.",
    "",
    "Data access:",
    "- You have full access to the user's portfolio data in the context below.",
    "- Use your READ tools (getDashboardOverview, getRentCollection, getWorkOrders, getComplianceOverview, getClientPortfolio) when you need current, structured figures for accuracy.",
    "- Use context data for general questions; use tools when the manager needs exact live numbers.",
    "- Never say you don't have access to data that is present in the context. If you can derive the answer from the context, do so.",
    "",
    ...(isPro
      ? [
          "Action tools (Pro routes only):",
          "- You can execute real actions on behalf of the manager: search_properties, create_property, update_property, record_maintenance, create_lease, update_lease, create_tenant, update_tenant, record_payment, update_payment.",
          "- These run for real, immediately — there is no separate confirmation step, so only call them once you have the right ids and values (use search_properties or the read tools to find ids first).",
          "- delete_property, delete_lease, delete_tenant, and delete_payment are different: calling them NEVER deletes anything by itself. They prepare a preview of what would be destroyed and show the manager an approval card — only the manager's click actually deletes. Tell the manager: 'I've prepared that delete for your approval — please review the card below.'",
          "- After a direct write succeeds, confirm in your text reply what you did (e.g. 'Created lease LEASE-0042 on PROP-0001.').",
          "",
        ]
      : []),
    "When answering:",
    "- Be specific and data-driven. Show actual numbers from the context or tools.",
    "- Keep responses concise and practical. Avoid padding or generic filler.",
    "- Use Markdown formatting (bold, lists, tables where helpful).",
    "- Link to in-app routes when relevant, e.g. [View Property](/property/PROP-0001).",
    "",
    "Context data:",
    promptContext,
  ].join("\n");

// ---------------------------------------------------------------------------
// Phase 4 — Reply engine with Claude tool-calling
//
// Priority: ANTHROPIC_API_KEY → Claude with tools
//           OPENAI_API_KEY    → OpenAI without tools (existing path)
//           neither           → deterministic fallback
// ---------------------------------------------------------------------------

async function generateAssistantReply(
  userMessage: string,
  context: AiOverlayContext,
  history: AiMessage[],
): Promise<{
  content: string;
  artifactDocIds?: string[];
  steps?: AiMessageStep[];
  proposedAction?: AiProposedAction;
}> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const isPro = context.pathname === "/pro" || context.pathname.startsWith("/pro/");

  // --- Claude path (tool-use) ---
  if (anthropicKey) {
    try {
      const [{ generateText, stepCountIs }, { anthropic }] = await Promise.all([
        import("ai"),
        import("@ai-sdk/anthropic"),
      ]);

      const recent = history.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const tools = isPro ? PRO_TOOLS : CONSUMER_TOOLS;

      const result = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        system: SYSTEM_PROMPT(context.promptContext, isPro),
        messages: [...recent, { role: "user", content: userMessage }],
        tools,
        // Search→write chains (find the property, then update it) need more than one round trip.
        stopWhen: stepCountIs(8),
      });

      // Build the steps array for the Activity pane.
      const steps: AiMessageStep[] = result.steps.flatMap((step) =>
        step.toolCalls.map((call) => {
          const successful = isToolStepSuccessful(
            call.toolCallId,
            step.toolResults,
            step.content,
          );
          return {
            tool: call.toolName,
            args: call.input as Record<string, unknown>,
            summary: toolSummaryLabel(
              call.toolName,
              (call.input as Record<string, unknown>) ?? {},
            ),
            ...(successful ? {} : { ok: false as const }),
          };
        }),
      );

      // Extract the first proposed action from tool results, if any.
      let proposedAction: AiProposedAction | undefined;
      for (const step of result.steps) {
        for (const res of step.toolResults) {
          const output = res.output as Record<string, unknown> | null;
          if (output && typeof output === "object" && "proposedAction" in output) {
            const raw = output.proposedAction as AiProposedAction;
            if (raw && raw.toolName && raw.args && raw.consequence) {
              proposedAction = raw;
              break;
            }
          }
        }
        if (proposedAction) break;
      }

      return {
        content: result.text.trim() || "I couldn't generate a response. Please try again.",
        steps: steps.length > 0 ? steps : undefined,
        proposedAction,
      };
    } catch (err) {
      console.error("[ai-overlay] Anthropic error:", err);
      // Fall through to OpenAI then deterministic
    }
  }

  // --- OpenAI path (no tools) ---
  if (openaiKey) {
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
        model: openai("gpt-4o-mini"),
        system: SYSTEM_PROMPT(context.promptContext, isPro),
        messages: [...recent, { role: "user", content: userMessage }],
      });

      return { content: text.trim() || "I couldn't generate a response. Please try again." };
    } catch (err) {
      console.error("[ai-overlay] OpenAI error:", err);
    }
  }

  // --- Deterministic fallback ---
  return await generateDeterministicReply(userMessage, context);
}

// ---------------------------------------------------------------------------
// Phase 0 — getOverlayBootstrap with surface-aware session selection
// ---------------------------------------------------------------------------

export async function getOverlayBootstrap(
  pathname: string,
  activeSessionId?: string | null,
): Promise<ActionResult<AiOverlayBootstrap>> {
  try {
    const parsedPath = pathnameSchema.parse(pathname);
    const authCtx = await requireCtx();
    const context = await buildAiOverlayContext(parsedPath);

    let sessions = (await listAiSessions(authCtx)).filter(
      (s) => s.status === "active",
    );
    const surface = surfaceKey(parsedPath);

    // If an explicit session is provided and valid, honour it.
    const explicitSession =
      activeSessionId && sessions.some((s) => s.id === activeSessionId)
        ? activeSessionId
        : null;

    let resolvedSessionId: string | null;

    if (explicitSession) {
      resolvedSessionId = explicitSession;
    } else {
      // Prefer the most recent session scoped to this surface.
      const matchingSession = sessions.find(
        (s) => surfaceKey(s.contextRoute) === surface,
      );

      if (matchingSession) {
        resolvedSessionId = matchingSession.id;
      } else {
        // No session for this surface — create one with a welcome message.
        const session = await createAiSession(authCtx, {
          title: buildSessionTitle(context),
          contextRoute: parsedPath,
          contextPropertyId: context.propertyId ?? undefined,
          status: "active",
        });
        await createAiMessage(authCtx, {
          sessionId: session.id,
          role: "assistant",
          content: buildWelcomeMessage(context),
        });
        sessions = [session, ...sessions];
        resolvedSessionId = session.id;
      }
    }

    const messages = resolvedSessionId
      ? await listAiMessages(authCtx, resolvedSessionId)
      : [];

    const agentMode: AiOverlayAgentMode = process.env.ANTHROPIC_API_KEY
      ? "full"
      : "basic";

    return stripUndefined({
      ok: true as const,
      data: {
        context: toClientContext(context),
        sessions,
        activeSessionId: resolvedSessionId,
        messages,
        agentMode,
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
    const authCtx = await requireCtx();
    const context = await buildAiOverlayContext(parsedPath);

    const session = await createAiSession(authCtx, {
      title: title?.trim() || buildSessionTitle(context),
      contextRoute: parsedPath,
      contextPropertyId: context.propertyId ?? undefined,
      status: "active",
    });

    const welcome = await createAiMessage(authCtx, {
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
    const authCtx = await requireCtx();
    const updated = await updateAiSession(authCtx, id, { status: "archived" });
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
    const authCtx = await requireCtx();
    const session = await getAiSession(authCtx, id);
    if (!session || session.status !== "active") {
      return { ok: false, error: "Session not found." };
    }
    const messages = await listAiMessages(authCtx, id);
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
    const authCtx = await requireCtx();

    const session = await getAiSession(authCtx, sessionId);
    if (!session || session.status !== "active") {
      return { ok: false, error: "Session not found." };
    }

    const context = await buildAiOverlayContext(pathname);
    const history = await listAiMessages(authCtx, sessionId);

    // If this is the first user message, set the session title from the message content.
    const isFirstUserMessage = !history.some((m) => m.role === "user");
    let updatedSessionTitle: string | undefined;
    if (isFirstUserMessage) {
      updatedSessionTitle = await generateSessionTitle(content);
      await updateAiSession(authCtx, sessionId, {
        title: updatedSessionTitle,
      });
    }

    await createAiMessage(authCtx, {
      sessionId,
      role: "user",
      content,
    });

    const reply = await generateAssistantReply(content, context, history);

    await createAiMessage(authCtx, {
      sessionId,
      role: "assistant",
      content: reply.content,
      artifactDocIds: reply.artifactDocIds,
      steps: reply.steps,
      proposedAction: reply.proposedAction,
    });

    if (!updatedSessionTitle) {
      // updateAiSession always bumps updatedAt server-side; empty patch = touch.
      await updateAiSession(authCtx, sessionId, {});
    }

    const messages = await listAiMessages(authCtx, sessionId);
    return stripUndefined({ ok: true as const, data: { messages, updatedSessionTitle } });
  } catch (err) {
    console.error("[ai-overlay] sendMessage error:", err);
    return { ok: false, error: "Could not send message." };
  }
}

// ---------------------------------------------------------------------------
// Phase 5 — Approval gate actions
//
// A proposed action always names a destructive tool from the shared registry
// (mcp-server/tool-defs.ts) — the 4 gated deletes are the only tools that ever
// produce a proposedAction; every other write already executed before the
// message was created. Approving re-runs that same tool's commit() with the
// exact args the preview was shown for, then audits it like any other write.
// On reject, we record the rejection without touching any data.
// ---------------------------------------------------------------------------

export async function approveProposedAction(
  messageId: string,
): Promise<ActionResult<{ messages: AiMessage[] }>> {
  try {
    const id = messageIdSchema.parse(messageId);
    const authCtx = await requireCtx();

    const message = await getAiMessage(authCtx, id);
    if (!message || !message.proposedAction) {
      return { ok: false, error: "Message or proposed action not found." };
    }

    const { toolName, args } = message.proposedAction;
    const toolDef = VALGATE_TOOLS.find((candidate) => candidate.name === toolName);
    if (!toolDef || toolDef.kind !== "destructive") {
      return { ok: false, error: `Unknown action: ${toolName}` };
    }

    const result = await toolDef.commit(authCtx, args);
    if (result.ok && toolDef.audit) {
      await audit(authCtx, toolDef.audit(authCtx, args, result.data));
    }

    await updateAiMessage(authCtx, id, {
      actionResult: result.ok ? { ok: true } : { ok: false, error: result.message },
    });

    const session = await getAiSession(authCtx, message.sessionId);
    if (!session) return { ok: false, error: "Session not found." };
    const messages = await listAiMessages(authCtx, message.sessionId);
    return stripUndefined({ ok: true as const, data: { messages } });
  } catch (err) {
    console.error("[ai-overlay] approveProposedAction error:", err);
    return { ok: false, error: "Could not approve action." };
  }
}

export async function rejectProposedAction(
  messageId: string,
): Promise<ActionResult<{ messages: AiMessage[] }>> {
  try {
    const id = messageIdSchema.parse(messageId);
    const authCtx = await requireCtx();

    const message = await getAiMessage(authCtx, id);
    if (!message || !message.proposedAction) {
      return { ok: false, error: "Message or proposed action not found." };
    }

    await updateAiMessage(authCtx, id, {
      actionResult: { ok: false, error: "Rejected" },
    });

    const messages = await listAiMessages(authCtx, message.sessionId);
    return stripUndefined({ ok: true as const, data: { messages } });
  } catch (err) {
    console.error("[ai-overlay] rejectProposedAction error:", err);
    return { ok: false, error: "Could not reject action." };
  }
}

// ---------------------------------------------------------------------------
// Phase 6 — Undo (inverse mutations for approved actions)
// ---------------------------------------------------------------------------

export async function undoApprovedAction(
  messageId: string,
): Promise<ActionResult<{ messages: AiMessage[] }>> {
  try {
    const id = messageIdSchema.parse(messageId);
    const authCtx = await requireCtx();

    const message = await getAiMessage(authCtx, id);
    if (!message || !message.proposedAction || !message.actionResult?.ok) {
      return { ok: false, error: "No successful action to undo." };
    }

    // Every proposedAction is now a gated delete (see approveProposedAction) — there is no
    // pre-image to restore for a permanent delete. The activities table is the record of what
    // happened instead; undo a delete by recreating the record if needed.
    return {
      ok: false,
      error: "This action can't be undone — it was a permanent delete. Check the activity log.",
    };
  } catch (err) {
    console.error("[ai-overlay] undoApprovedAction error:", err);
    return { ok: false, error: "Could not undo action." };
  }
}

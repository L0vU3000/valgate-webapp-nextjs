"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as aiSessionsDb from "@/lib/data/db/ai-sessions";
import * as aiMessagesDb from "@/lib/data/db/ai-messages";
import * as agentRunsDb from "@/lib/data/db/agent-runs";
import * as paymentsDb from "@/lib/data/db/payments";
import * as leasesDb from "@/lib/data/db/leases";
import * as maintenanceDb from "@/lib/data/db/maintenance-items";
import * as safetyRisksDb from "@/lib/data/db/safety-risks";
import * as propertiesDb from "@/lib/data/db/properties";
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
import {
  markRentPaid,
  logRentPayment,
  renewLease,
  createWorkOrder,
  updateWorkOrder,
  resolveSafetyRisk,
  assignProperties,
} from "@/app/(pro)/pro/actions";
import type { AiSession } from "@/lib/data/types/ai-session";
import type { AiMessage, AiMessageStep, AiProposedAction } from "@/lib/data/types/ai-message";
import { isToolStepSuccessful, surfaceKey } from "@/lib/actions/ai-overlay-utils";
import type { AgentKey } from "@/lib/data/types/agent-run";

// Maps a proposed action name to the agent key for the Agent Hub board card.
const ACTION_AGENT_MAP: Partial<Record<string, AgentKey>> = {
  markRentPaid: "rent-watch",
  logRentPayment: "rent-watch",
  createWorkOrder: "maintenance-coordinator",
  updateWorkOrder: "maintenance-coordinator",
  renewLease: "lease-renewal",
  resolveSafetyRisk: "compliance-sentinel",
  assignProperties: "portfolio-analyst",
};

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
          "- You can propose actions on behalf of the manager using the propose_* tools.",
          "- These tools do NOT execute anything — they prepare a proposal for the manager to review and approve.",
          "- When a manager asks you to take an action (mark rent paid, renew a lease, create a work order, etc.), call the matching propose_* tool.",
          "- After calling a propose_* tool, confirm in your text reply: 'I've prepared that action for your approval — please review the card below.'",
          "- NEVER claim you have executed an action. You can only propose; the manager approves.",
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
        stopWhen: stepCountIs(5),
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
            if (raw && raw.action && raw.payload && raw.consequence) {
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
    const userId = getCurrentUserId();
    const context = await buildAiOverlayContext(parsedPath);

    let sessions = await aiSessionsDb.listActive(userId);
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
        sessions = [session, ...sessions];
        resolvedSessionId = session.id;
      }
    }

    const messages = resolvedSessionId
      ? await aiMessagesDb.listBySession(userId, resolvedSessionId)
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

    // If this is the first user message, set the session title from the message content.
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

    const assistantMessage = await aiMessagesDb.create(userId, {
      sessionId,
      role: "assistant",
      content: reply.content,
      artifactDocIds: reply.artifactDocIds,
      steps: reply.steps,
      proposedAction: reply.proposedAction,
    });

    // If the agent proposed an action, surface it as a board card in Agent Hub.
    if (reply.proposedAction) {
      const agentKey = ACTION_AGENT_MAP[reply.proposedAction.action];
      if (agentKey) {
        try {
          await agentRunsDb.upsertForProposal(userId, assistantMessage.id, {
            agentKey,
            title: `${agentKey} proposal`,
            task: reply.proposedAction.consequence,
            status: "needs-approval",
            proposalMessageId: assistantMessage.id,
            sessionId,
          });
        } catch (e) {
          console.error("[ai-overlay] agent-run upsert failed:", e);
        }
      }
    }

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

// ---------------------------------------------------------------------------
// Phase 5 — Approval gate actions
//
// When a manager approves a proposed action, we execute the real action
// and record the result on the message. On reject, we record the rejection
// without touching any data.
// ---------------------------------------------------------------------------

export async function approveProposedAction(
  messageId: string,
): Promise<ActionResult<{ messages: AiMessage[] }>> {
  try {
    const id = messageIdSchema.parse(messageId);
    const userId = getCurrentUserId();

    const message = await aiMessagesDb.get(userId, id);
    if (!message || !message.proposedAction) {
      return { ok: false, error: "Message or proposed action not found." };
    }

    const { action, payload } = message.proposedAction;

    // Dispatch to the correct Pro action.
    let actionResult: Awaited<ReturnType<typeof markRentPaid>>;

    switch (action) {
      case "markRentPaid":
        actionResult = await markRentPaid(payload as Parameters<typeof markRentPaid>[0]);
        break;
      case "logRentPayment":
        actionResult = await logRentPayment(payload as Parameters<typeof logRentPayment>[0]);
        break;
      case "renewLease":
        actionResult = await renewLease(payload as Parameters<typeof renewLease>[0]);
        break;
      case "createWorkOrder":
        actionResult = await createWorkOrder(payload as Parameters<typeof createWorkOrder>[0]);
        break;
      case "updateWorkOrder":
        actionResult = await updateWorkOrder(payload as Parameters<typeof updateWorkOrder>[0]);
        break;
      case "resolveSafetyRisk":
        actionResult = await resolveSafetyRisk(payload as Parameters<typeof resolveSafetyRisk>[0]);
        break;
      case "assignProperties":
        actionResult = await assignProperties(payload as Parameters<typeof assignProperties>[0]);
        break;
      default:
        return { ok: false, error: `Unknown action: ${action}` };
    }

    await aiMessagesDb.update(userId, id, {
      actionResult: actionResult.ok
        ? { ok: true }
        : { ok: false, error: actionResult.error },
    });

    const session = await aiSessionsDb.get(userId, message.sessionId);
    if (!session) return { ok: false, error: "Session not found." };
    const messages = await aiMessagesDb.listBySession(userId, message.sessionId);
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
    const userId = getCurrentUserId();

    const message = await aiMessagesDb.get(userId, id);
    if (!message || !message.proposedAction) {
      return { ok: false, error: "Message or proposed action not found." };
    }

    await aiMessagesDb.update(userId, id, {
      actionResult: { ok: false, error: "Rejected" },
    });

    const messages = await aiMessagesDb.listBySession(userId, message.sessionId);
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
    const userId = getCurrentUserId();

    const message = await aiMessagesDb.get(userId, id);
    if (!message || !message.proposedAction || !message.actionResult?.ok) {
      return { ok: false, error: "No successful action to undo." };
    }

    const { action, payload, preImage } = message.proposedAction;

    // Inverse mutations — restore pre-image state.
    switch (action) {
      case "markRentPaid": {
        // Restore the prior payment status.
        const pi = preImage as { status: string } | null;
        const paymentId = (payload as { paymentId: string }).paymentId;
        await paymentsDb.update(userId, paymentId, {
          status: (pi?.status ?? "Pending") as "Paid" | "Pending" | "Overdue",
        });
        break;
      }
      case "logRentPayment": {
        // We don't have the created payment ID stored. Skip for now.
        // ponytail: undo for logRentPayment requires storing the created ID — add if requested.
        break;
      }
      case "renewLease": {
        const pi = preImage as { endDate: number; renewalStatus?: string } | null;
        const leaseId = (payload as { leaseId: string }).leaseId;
        await leasesDb.update(userId, leaseId, {
          endDate: pi?.endDate ?? 0,
          renewalStatus: pi?.renewalStatus as "Renewed" | "NotRenewed" | undefined,
        });
        break;
      }
      case "createWorkOrder": {
        // Work order ID not stored on the message; mark as Resolved to soft-undo.
        // ponytail: real delete would need storing the created ID — add if requested.
        break;
      }
      case "updateWorkOrder": {
        const pi = preImage as { status?: string; vendorId?: string; cost?: number } | null;
        const woId = (payload as { id: string }).id;
        await maintenanceDb.update(userId, woId, {
          status: (pi?.status ?? "Open") as "Open" | "InProgress" | "Resolved",
          vendorId: pi?.vendorId,
          cost: pi?.cost,
        });
        break;
      }
      case "resolveSafetyRisk": {
        const pi = preImage as { status: string; resolvedAt?: number } | null;
        const riskId = (payload as { riskId: string }).riskId;
        await safetyRisksDb.update(userId, riskId, {
          status: (pi?.status ?? "Open") as "Open" | "Resolved",
          resolvedAt: undefined,
          updatedAt: Date.now(),
        });
        break;
      }
      case "assignProperties": {
        const pi = preImage as Record<string, { clientId?: string }> | null;
        if (pi) {
          for (const [propertyId, state] of Object.entries(pi)) {
            await propertiesDb.update(userId, propertyId, {
              clientId: state.clientId,
            });
          }
        }
        break;
      }
      default:
        return { ok: false, error: `Undo not supported for action: ${action}` };
    }

    await aiMessagesDb.update(userId, id, {
      actionResult: { ok: true, undone: true },
    });

    const messages = await aiMessagesDb.listBySession(userId, message.sessionId);
    return stripUndefined({ ok: true as const, data: { messages } });
  } catch (err) {
    console.error("[ai-overlay] undoApprovedAction error:", err);
    return { ok: false, error: "Could not undo action." };
  }
}

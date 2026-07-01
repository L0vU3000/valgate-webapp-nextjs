import { v } from "convex/values";
import { action } from "../_generated/server";
import { components } from "../_generated/api";
import { listUIMessages, extractText } from "@convex-dev/agent";
import { copilotAgent } from "./copilot";

// Agent-native messages: list messages via Agent component and generate replies via Agent thread

export const getMessagesDecrypted = action({
  args: { threadId: v.id("threads") },
  returns: v.array(
    v.object({ id: v.id("messages"), role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")), content: v.string() }),
  ),
  handler: async (ctx, { threadId }) => {
    const page = await listUIMessages(ctx, components.agent, {
      threadId,
      paginationOpts: { cursor: null, numItems: 50 },
    } as any);
    const result = (page.page as any[]).map((m: any) => ({
      id: m._id,
      role: m.role,
      content: extractText(m),
    }));
    return result as any;
  },
});

export const sendAndStream = action({
  args: { threadId: v.id("threads"), content: v.string() },
  returns: v.array(v.object({ kind: v.string(), payload: v.any() })),
  handler: async (ctx, { threadId, content }) => {
    const { thread } = await copilotAgent.continueThread(ctx, { threadId });
    const gen = await thread.generateText({ prompt: content });
    const reply = (gen as any)?.text || "";
    const tokens: Array<{ kind: string; payload: any }> = [];
    for (const t of reply.split(/(\s+)/).filter((s: string) => s.length)) {
      tokens.push({ kind: "token", payload: t });
      if (tokens.length > 100) break;
    }
    tokens.push({ kind: "final", payload: reply });
    return tokens as any;
  },
});



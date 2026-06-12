import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { components } from "../_generated/api";
import { createThread } from "@convex-dev/agent";
import { copilotAgent } from "./copilot";
import type { Id } from "../_generated/dataModel";

// Agent-native thread operations using the Convex Agent component

export const startThread = mutation({
  args: { title: v.string() },
  // Return the agent thread id and title for the UI
  returns: v.object({ threadId: v.id("threads"), title: v.string() }),
  handler: async (ctx, args) => {
    const threadId = await createThread(ctx, components.agent, { title: args.title });
    return { threadId:  threadId as Id<"threads">, title: args.title };
  },
});

export const renameThread = action({
  args: { threadId: v.id("threads"), title: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { threadId, title }) => {
    const { thread } = await copilotAgent.continueThread(ctx, { threadId });
    await thread.updateMetadata({ title });
    return { ok: true };
  },
});

export const deleteThread = action({
  args: { threadId: v.id("threads") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { threadId }) => {
    const { thread } = await copilotAgent.continueThread(ctx, { threadId });
    // Archive the thread via metadata to avoid destructive deletes
    await thread.updateMetadata({ status: "archived" as const });
    return { ok: true };
  },
});

export const listThreads = query({
  args: {},
  returns: v.array(
    v.object({ _id: v.id("threads"), title: v.string(), updatedAt: v.string() }),
  ),
  handler: async (ctx) => {
    // Query underlying Agent threads directly
    const rows = await ctx.db.query("threads").order("desc").take(50);
    return (rows as any[]).map((r: any) => ({
      _id: r._id,
      title: r.metadata?.title || "Untitled",
      updatedAt: (r.updatedAt as string) || new Date(r._creationTime).toISOString(),
    }));
  },
});



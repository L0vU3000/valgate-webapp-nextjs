import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { api } from "../_generated/api";

export const logEvent = mutation({
  args: {
    threadId: v.id("copilot_thread"),
    kind: v.string(),
    payload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, kind, payload }) => {
    // Enforce caller membership via getThreadMeta (throws if unauthorized)
    const meta = await ctx.runQuery(api.copilot.threads.getThreadMeta, { threadId } as any);
    const thread = await ctx.db.get(threadId);
    if (!thread) return null;
    await ctx.db.insert("copilot_event", {
      orgId: meta.orgId,
      threadId,
      kind,
      payload,
      createdAt: new Date().toISOString(),
    } as any);
    return null;
  },
});



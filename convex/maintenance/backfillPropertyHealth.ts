import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { recalculatePropertyProgress } from "../trigger/property";

export const run = internalMutation({
  args: { orgId: v.optional(v.id("orgs")) },
  returns: v.object({ processed: v.number() }),
  handler: async (ctx, args) => {
    let processed = 0;
    const iter = ctx.db.query("property");
    const query = args.orgId ? iter.withIndex("by_org_status", (q: any) => q.eq("orgId", args.orgId)) : iter;
    for await (const prop of query) {
      await recalculatePropertyProgress(ctx as any, (prop as any)._id as Id<"property">);
      processed += 1;
    }
    return { processed } as any;
  },
});



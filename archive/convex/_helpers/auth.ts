import { query, mutation, type QueryCtx } from "../_generated/server";
import type { Validator } from "convex/values";

type Handler<C, A, R> = (ctx: C, args: A) => Promise<R> | R;

export function authQuery<A extends Record<string, any>, R>(config: {
  args: { [K in keyof A]: Validator<any> };
  handler: (ctx: QueryCtx, args: A & { __identity: { subject: string } }) => Promise<R> | R;
}) {
  return query({
    args: config.args as any,
    handler: async (ctx, args: any) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");
      return config.handler(ctx, { ...args, __identity: { subject: identity.subject } } as any);
    },
  });
}

export function authMutation<A extends Record<string, any>, R>(config: {
  args: { [K in keyof A]: Validator<any> };
  handler: (ctx: QueryCtx, args: A & { __identity: { subject: string } }) => Promise<R> | R;
}) {
  return mutation({
    args: config.args as any,
    handler: async (ctx, args: any) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");
      return config.handler(ctx as any, { ...args, __identity: { subject: identity.subject } } as any);
    },
  });
}



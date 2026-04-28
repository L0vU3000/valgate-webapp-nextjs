import { internal } from "../_generated/api";
import { v } from "convex/values";
import { action } from "../_generated/server";

// NOTE: This scheduler module intentionally avoids importing AWS SDK.
// It only schedules and triggers the cleanup action defined in actions/propertyDocuments.ts

export const scheduleTemporaryCleanup = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    docId: v.id("property_document"),
    s3Key: v.string(),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use relative delay (ms). Default: 60 seconds.
    const delay = args.delayMs ?? 1000 * 60; // 1 minute
    console.log("Scheduling temporary cleanup for document", args.docId, "in", delay, "ms");
    await (ctx as any).scheduler.runAfter(delay, (internal as any).scheduler.propertyDocuments.cleanupOne, {
      orgId: args.orgId as any,
      docId: args.docId as any,
      s3Key: args.s3Key,
    } as any);
    return { scheduledInMs: delay };
  },
});

export const cleanupOne = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    docId: v.id("property_document"),
    s3Key: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runAction((internal as any).actions.propertyDocuments.cleanupTemporaryDocument, args as any);
    } catch {}
    return { ok: true } as any;
  },
});

// Schedule a background OCR transcription pass that fills encrypted descriptions on document_files.
export const scheduleTranscriptionFromStaging = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    documents: v.array(
      v.object({
        fileId: v.id("document_files"),
        key: v.string(),
        versionId: v.optional(v.string()),
        mime: v.string(),
      }),
    ),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Default: schedule immediately; caller can pass a delay to stagger load.
    const delay = args.delayMs ?? 0;
    await (ctx as any).scheduler.runAfter(
      delay,
      (internal as any).scheduler.propertyDocuments.runTranscriptionFromStaging,
      {
        orgId: args.orgId as any,
        documents: args.documents as any,
      } as any,
    );
    return { scheduledInMs: delay };
  },
});

export const runTranscriptionFromStaging = action({
  args: {
    orgId: v.union(v.id("orgs"), v.string()),
    documents: v.array(
      v.object({
        fileId: v.id("document_files"),
        key: v.string(),
        versionId: v.optional(v.string()),
        mime: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    try {
      // Delegate to the heavy OCR + envelope-writing action.
      await ctx.runAction(
        (internal as any).actions.document.startOcrForTranscription,
        args as any,
      );
    } catch {
      // Swallow errors so the scheduled function doesn't cascade failures; logs visible in Convex dashboard.
    }
    return { ok: true } as any;
  },
});


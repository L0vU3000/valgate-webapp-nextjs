import { defineTable } from "convex/server";
import { v } from "convex/values";

export const copilot_thread = defineTable({
  orgId: v.id("orgs"),
  title: v.string(),
  createdBy: v.id("users"),
  lastMessageAt: v.string(),
  status: v.union(v.literal("active"), v.literal("archived")),
  deletedAt: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_updatedAt", ["orgId", "updatedAt"]) 
  .index("by_org_status", ["orgId", "status"]);

export const copilot_message = defineTable({
  orgId: v.id("orgs"),
  threadId: v.id("copilot_thread"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  // Envelope encryption fields
  algo: v.literal("AES-256-GCM"),
  ivB64: v.string(),
  aadV: v.number(),
  dekCiphertextB64: v.string(), // KMS-encrypted DEK
  ciphertextB64: v.string(),     // includes auth tag
  // Tool & citation metadata
  tools: v.optional(v.array(v.string())),
  citations: v.optional(
    v.array(
      v.object({
        fileId: v.id("_storage"),
        span: v.object({ start: v.number(), end: v.number() }),
      })
    )
  ),
  // Embedding for vector search (no plaintext stored)
  embedding: v.optional(v.array(v.number())),
  model: v.optional(v.string()),
  tokenIn: v.optional(v.number()),
  tokenOut: v.optional(v.number()),
  createdBy: v.id("users"),
  createdAt: v.string(),
})
  .index("by_thread", ["threadId"]) 
  .index("by_org_createdAt", ["orgId", "createdAt"]);

export const copilot_event = defineTable({
  orgId: v.id("orgs"),
  threadId: v.id("copilot_thread"),
  kind: v.string(), // token|final|intent|tool_start|tool_result|citations
  payload: v.any(), // redaction-safe payload
  createdAt: v.string(),
})
  .index("by_thread_time", ["threadId", "createdAt"]);

export const copilot_index = defineTable({
  orgId: v.id("orgs"),
  fileId: v.id("_storage"),
  propertyId: v.optional(v.id("property")),
  chunkRef: v.object({ offset: v.number(), len: v.number() }),
  vector: v.array(v.number()),
  metadata: v.optional(v.any()),
  createdAt: v.string(),
})
  .index("by_org_file", ["orgId", "fileId"]) 
  .index("by_org_property", ["orgId", "propertyId"]);

export const copilot_usage = defineTable({
  orgId: v.id("orgs"),
  threadId: v.id("copilot_thread"),
  day: v.string(),
  tokensIn: v.number(),
  tokensOut: v.number(),
  calls: v.number(),
})
  .index("by_org_day", ["orgId", "day"]);



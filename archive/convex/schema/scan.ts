import { defineTable } from "convex/server";
import { v } from "convex/values";

export const scan_sessions = defineTable({
  orgId: v.id("orgs"),
  creatorUserId: v.id("users"),
  propertyId: v.optional(v.id("property")),
  status: v.union(
    v.literal("active"),
    v.literal("expired"),
    v.literal("done"),
    v.literal("cancelled"),
  ),
  qrToken: v.string(),
  expiresAt: v.string(),
  maxCaptures: v.number(),
  totalCaptures: v.optional(v.number()),
  lastCaptureAt: v.optional(v.string()),
  lastOpenedAt: v.optional(v.string()),
  openCount: v.optional(v.number()),
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_status", ["orgId", "status"])
  .index("by_qrToken", ["qrToken"]);

export const scan_captures = defineTable({
  orgId: v.id("orgs"),
  scanSessionId: v.id("scan_sessions"),
  captureIndex: v.number(),
  objectKey: v.string(),
  mimeType: v.string(),
  sizeBytes: v.optional(v.number()),
  ocrStatus: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("done"),
    v.literal("failed"),
  ),
  ocrResult: v.optional(v.any()),
  errorReason: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_session_index", ["scanSessionId", "captureIndex"]);


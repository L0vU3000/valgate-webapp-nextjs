// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { schemaTables } from "./schema/index";

export default defineSchema(
  {
    // Include identity & properties domain
    ...(schemaTables as any),
    activities: defineTable({
      orgId: v.optional(v.string()),
      type: v.string(),
      userId: v.string(),
      entityId: v.optional(v.string()),
      entityType: v.optional(v.string()),
      metadata: v.any(),
      createdAt: v.string(),
    })
      .index("by_org_createdAt", ["orgId", "createdAt"]) 
      .index("by_org_type", ["orgId", "type"]),

    // AI-28: AI Tasks
    aiTasks: defineTable({
      orgId: v.string(),
      type: v.string(), // question|suggestion|summary|analysis
      status: v.string(), // pending|processing|completed|failed
      input: v.any(),
      output: v.optional(v.any()),
      metadata: v.optional(v.any()), // { model, tokens, processingTimeMs, confidence }
      error: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
      completedAt: v.optional(v.string()),
    })
      .index("by_org_status_createdAt", ["orgId", "status", "createdAt"]) // (orgId, status, createdAt)
      .index("by_org_createdAt", ["orgId", "createdAt"]),


    // AI-24: Ingestion - Uploads
    uploads: defineTable({
      orgId: v.string(),
      userId: v.string(),
      fileUrl: v.string(),
      fileName: v.string(),
      fileSize: v.number(),
      mimeType: v.string(),
      status: v.string(),
      metadata: v.any(),
      idempotencyKey: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("by_org_status_createdAt", ["orgId", "status", "createdAt"]) // (orgId, status, createdAt)
      .index("by_org_createdAt", ["orgId", "createdAt"]),


    // AI-24: Ingestion - Bulk Imports
    bulk_imports: defineTable({
      orgId: v.string(),
      userId: v.string(),
      fileUrl: v.string(),
      fileName: v.string(),
      status: v.string(),
      totalRows: v.number(),
      validRows: v.number(),
      errorRows: v.number(),
      processedRows: v.number(),
      results: v.any(),
      completedAt: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("by_org_status_createdAt", ["orgId", "status", "createdAt"]) // (orgId, status, createdAt)
      .index("by_org_createdAt", ["orgId", "createdAt"]),


    // AI-27: Security - Access Logs
    accessLogs: defineTable({
      orgId: v.string(),
      userId: v.string(),
      entityType: v.string(),
      entityId: v.optional(v.string()),
      action: v.string(), // read|create|update|delete
      details: v.any(),
      ip: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      createdAt: v.string(),
    })
      .index("by_org_createdAt", ["orgId", "createdAt"]) // baseline
      .index("by_org_entity", ["orgId", "entityType", "createdAt"]) 
      .index("by_org_user", ["orgId", "userId", "createdAt"]),
    // AI-29: i18n - Translation Glossary
    translationGlossary: defineTable({
      orgId: v.string(),
      domain: v.string(),
      term: v.string(),
      text: v.object({ en: v.string(), km: v.optional(v.string()) }),
      isActive: v.boolean(),
      updatedBy: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("by_org_domain", ["orgId", "domain"]) // domain lookup
      .index("by_org_isActive", ["orgId", "isActive"]) // active filter
      .index("by_org_createdAt", ["orgId", "createdAt"]),

    // AI-29: i18n - Locale Settings
    localeSettings: defineTable({
      orgId: v.string(),
      defaults: v.any(),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("by_org", ["orgId"]) // one per org (enforced in code)
      .index("by_org_createdAt", ["orgId", "createdAt"]),

    // AI-30: Analytics Events
    analyticsEvents: defineTable({
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
      event: v.string(),
      properties: v.any(), // validated in functions to ensure no PII
      sessionId: v.optional(v.string()),
      timestamp: v.string(),
      environment: v.string(), // dev|staging|prod
      posthogId: v.optional(v.string()),
      processed: v.optional(v.boolean()),
      processedAt: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("by_org_timestamp", ["orgId", "timestamp"]) // (orgId, timestamp)
      .index("by_event_timestamp", ["event", "timestamp"]) // (event, timestamp)
      .index("by_user_timestamp", ["userId", "timestamp"]), // (userId, timestamp)
    
    // AI-31: Schema Meta (tracks Convex schema/app data migrations)
    schemaMeta: defineTable({
      key: v.string(), // e.g., "schema"
      version: v.string(), // e.g., "v1"
      appliedAt: v.string(),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("by_key", ["key"]) // singleton by key
      .index("by_createdAt", ["createdAt"]),

  },
  { schemaValidation: true }
);

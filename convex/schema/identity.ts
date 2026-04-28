import { defineTable } from "convex/server";
import { v } from "convex/values";

// Identity & RLS primitives to normalize Clerk <-> Convex
// These tables are additive and do not remove/alter existing ones.

export const orgs = defineTable({
  // Clerk organization id (org_...)
  clerkOrgId: v.string(),
  // Human slug from Clerk (unique per workspace in Clerk)
  slug: v.optional(v.string()),
  name: v.string(),
  // Optional metadata mirrored from Clerk or app-specific settings
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_clerkOrgId", ["clerkOrgId"]) // lookup by external id
  .index("by_slug", ["slug"]) // slug-based resolution
  .index("by_createdAt", ["createdAt"]);

export const users = defineTable({
  // Clerk user id (user_...)
  clerkUserId: v.string(),
  primaryEmail: v.string(),
  displayName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  // Optional metadata mirrored from Clerk or app preferences
  metadata: v.optional(v.any()),
  lastActiveAt: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_clerkUserId", ["clerkUserId"]) // lookup by external id
  .index("by_email", ["primaryEmail"]) // email quick search
  .index("by_createdAt", ["createdAt"]);

export const org_members = defineTable({
  // Normalized membership join table for RLS enforcement in app code
  orgId: v.id("orgs"),
  userId: v.id("users"),
  role: v.string(), // owner|admin|member|viewer, etc.
  status: v.string(), // active|invited|suspended|removed
  // Optional fine-grained scopes/permissions
  permissions: v.optional(v.array(v.string())),
  invitedByUserId: v.optional(v.id("users")),
  invitedAt: v.optional(v.string()),
  joinedAt: v.optional(v.string()),
  removedAt: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_user", ["orgId", "userId"]) // one membership per user/org
  .index("by_user", ["userId"]) // list orgs for a user
  .index("by_org_role", ["orgId", "role"]) // role-based listing
  .index("by_org_status", ["orgId", "status"]) // membership lifecycle
  .index("by_org_createdAt", ["orgId", "createdAt"]);



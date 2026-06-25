import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";

export const aiSessionStatusEnum = pgEnum("ai_session_status", ["active", "archived"]);
export const aiMessageRoleEnum = pgEnum("ai_message_role", ["user", "assistant"]);

export const aiSessions = pgTable("ai_sessions", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  contextRoute: text("context_route").notNull(),
  contextPropertyId: text("context_property_id"),
  status: aiSessionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => [
  index("ix_ai_sessions_org").on(t.orgId),
]);

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull().references(() => aiSessions.id, { onDelete: "cascade" }),
  role: aiMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  artifactDocIds: text("artifact_doc_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [
  index("ix_ai_messages_org").on(t.orgId),
  index("ix_ai_messages_session").on(t.sessionId),
]);

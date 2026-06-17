import { z } from "zod";
import { idSchema, timestampSchema } from "./_common";
import { AiMessageStepSchema } from "./ai-message";

export const AgentKeySchema = z.enum([
  "rent-watch",
  "compliance-sentinel",
  "maintenance-coordinator",
  "lease-renewal",
  "portfolio-analyst",
]);

export const AgentRunStatusSchema = z.enum([
  "watching",
  "detected",
  "needs-approval",
  "done",
]);

export const AgentRunSchema = z.object({
  id: idSchema,
  agentKey: AgentKeySchema,
  title: z.string().min(1),
  task: z.string().min(1),
  status: AgentRunStatusSchema,
  finding: z.string().optional(),
  steps: z.array(AiMessageStepSchema).optional(),
  sessionId: z.string().optional(),
  proposalMessageId: z.string().optional(),
  lastRunAt: timestampSchema.optional(),
  nextRunAt: timestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type AgentRun = z.infer<typeof AgentRunSchema>;
export type AgentKey = z.infer<typeof AgentKeySchema>;
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

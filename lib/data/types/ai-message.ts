import { z } from "zod";
import { idSchema, timestampSchema } from "./_common";

export const AiMessageRoleSchema = z.enum(["user", "assistant"]);

// One tool call the agent made while generating this message.
// ponytail: summaries are derived labels, not raw payloads — keeps UI readable.
export const AiMessageStepSchema = z.object({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
  summary: z.string(),
  // Absent or true = success; false = tool call failed (back-compat with seed data).
  ok: z.boolean().optional(),
});

// An action the agent wants to take, waiting for manager approval.
export const AiProposedActionSchema = z.object({
  action: z.string(),
  payload: z.record(z.string(), z.unknown()),
  consequence: z.string(),
  preImage: z.record(z.string(), z.unknown()).optional(),
});

// The result after a manager approves or rejects a proposed action.
export const AiActionResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  undone: z.boolean().optional(),
});

export const AiMessageSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  role: AiMessageRoleSchema,
  content: z.string(),
  artifactDocIds: z.array(z.string()).optional(),
  // Pro agent overlay (persistence deferred to B11).
  steps: z.array(AiMessageStepSchema).optional(),
  proposedAction: AiProposedActionSchema.optional(),
  actionResult: AiActionResultSchema.optional(),
  createdAt: timestampSchema,
});

export type AiMessage = z.infer<typeof AiMessageSchema>;
export type AiMessageRole = z.infer<typeof AiMessageRoleSchema>;
export type AiMessageStep = z.infer<typeof AiMessageStepSchema>;
export type AiProposedAction = z.infer<typeof AiProposedActionSchema>;
export type AiActionResult = z.infer<typeof AiActionResultSchema>;

export const NewAiMessageSchema = AiMessageSchema.omit({ id: true, createdAt: true });
export type NewAiMessage = z.infer<typeof NewAiMessageSchema>;
export const AiMessagePatchSchema = NewAiMessageSchema.partial();
export type AiMessagePatch = z.infer<typeof AiMessagePatchSchema>;

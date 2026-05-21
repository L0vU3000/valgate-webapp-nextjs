import { z } from "zod";
import { idSchema, timestampSchema } from "./_common";

export const AiMessageRoleSchema = z.enum(["user", "assistant"]);

export const AiMessageSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  role: AiMessageRoleSchema,
  content: z.string(),
  artifactDocIds: z.array(z.string()).optional(),
  createdAt: timestampSchema,
});

export type AiMessage = z.infer<typeof AiMessageSchema>;
export type AiMessageRole = z.infer<typeof AiMessageRoleSchema>;

import { z } from "zod";
import { idSchema, timestampSchema } from "./_common";

export const AiSessionStatusSchema = z.enum(["active", "archived"]);

export const AiSessionSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  contextRoute: z.string().min(1),
  contextPropertyId: z.string().optional(),
  status: AiSessionStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type AiSession = z.infer<typeof AiSessionSchema>;
export type AiSessionStatus = z.infer<typeof AiSessionStatusSchema>;

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

export const NewAiSessionSchema = AiSessionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type NewAiSession = z.infer<typeof NewAiSessionSchema>;
export const AiSessionPatchSchema = NewAiSessionSchema.partial();
export type AiSessionPatch = z.infer<typeof AiSessionPatchSchema>;

import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const DbdiagramNodeStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
});

export const DbdiagramNoteSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  text: z.string(),
  color: z.string().optional(),
  attachedTo: z.string().optional(),
});

export const DbdiagramStateSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  version: z.literal(1),
  updatedAt: timestampSchema,
  nodes: z.record(z.string(), DbdiagramNodeStateSchema),
  notes: z.array(DbdiagramNoteSchema),
});

export type DbdiagramNodeState = z.infer<typeof DbdiagramNodeStateSchema>;
export type DbdiagramNote = z.infer<typeof DbdiagramNoteSchema>;
export type DbdiagramState = z.infer<typeof DbdiagramStateSchema>;

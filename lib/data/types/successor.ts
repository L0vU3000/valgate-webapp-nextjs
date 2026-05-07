import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const SuccessorSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  name: z.string().min(1),
  initials: z.string().min(1),
  relation: z.string().min(1),
  role: z.enum(["primary", "contingent"]),
  share: z.number().nonnegative(),
  verified: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Successor = z.infer<typeof SuccessorSchema>;

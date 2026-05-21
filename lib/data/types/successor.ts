import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const SuccessorSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  name: z.string().min(1),
  initials: z.string().min(1),
  relation: z.enum(["Spouse", "Child", "Sibling", "Parent", "Other"]),
  role: z.enum(["primary", "contingent"]),
  share: z.number().nonnegative(),
  verified: z.boolean(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Successor = z.infer<typeof SuccessorSchema>;
export type SuccessorRelation = Successor["relation"];

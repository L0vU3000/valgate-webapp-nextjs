import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const ProfessionalSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  name: z.string().min(1),
  company: z.string().min(1),
  category: z.string().min(1),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  linkedProperties: z.number().int().nonnegative(),
  available: z.boolean(),
  initials: z.string().min(1),
  avatarBg: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  verified: z.boolean().default(false),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Professional = z.infer<typeof ProfessionalSchema>;

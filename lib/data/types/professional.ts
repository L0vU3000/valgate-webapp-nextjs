import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const ProfessionalSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  name: z.string().min(1),
  company: z.string().min(1),
  category: z.enum(["Notary", "Lawyer", "Accountant", "Agent", "Electrician", "Plumber", "Inspector", "Maintenance"]),
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
export type ProfessionalCategory = Professional["category"];

export const NewProfessionalSchema = ProfessionalSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type NewProfessional = z.infer<typeof NewProfessionalSchema>;
export const ProfessionalPatchSchema = NewProfessionalSchema.partial();
export type ProfessionalPatch = z.infer<typeof ProfessionalPatchSchema>;

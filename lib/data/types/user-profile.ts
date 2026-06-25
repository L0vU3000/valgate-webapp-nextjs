import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const UserProfileSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  firstName: z.string(),
  lastName: z.string(),
  jobTitle: z.string().optional(),
  employeeId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  officeLocation: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  role: z.string().optional(),
  dashboardView: z.string().optional(),
  memberSince: timestampSchema.optional(),
  lastLogin: timestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const NewUserProfileSchema = UserProfileSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type NewUserProfile = z.infer<typeof NewUserProfileSchema>;
export const UserProfilePatchSchema = NewUserProfileSchema.partial();
export type UserProfilePatch = z.infer<typeof UserProfilePatchSchema>;

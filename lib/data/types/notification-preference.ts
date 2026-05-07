import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const NotificationPreferenceSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  eventType: z.string().min(1),
  email: z.boolean(),
  slack: z.boolean(),
  sms: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

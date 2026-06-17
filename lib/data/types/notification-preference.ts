import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const NotificationPreferenceSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  eventType: z.enum(["Payment", "Leasing", "Maintenance", "Compliance"]),
  email: z.boolean(),
  slack: z.boolean(),
  sms: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;
export type NotificationEventType = NotificationPreference["eventType"];

export const NewNotificationPreferenceSchema = NotificationPreferenceSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type NewNotificationPreference = z.infer<typeof NewNotificationPreferenceSchema>;
export const NotificationPreferencePatchSchema = NewNotificationPreferenceSchema.partial();
export type NotificationPreferencePatch = z.infer<typeof NotificationPreferencePatchSchema>;

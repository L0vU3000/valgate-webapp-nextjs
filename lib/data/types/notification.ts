import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

export const NotificationSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: z.string().optional(),
  category: z.enum(["MAINTENANCE", "LEASING", "COMPLIANCE", "PAYMENT", "APPLICATIONS", "ACCESS"]),
  title: z.string().min(1),
  description: z.string().min(1),
  createdAt: timestampSchema,
  read: z.boolean(),
  linkTo: z.string().optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationCategory = Notification["category"];

export const NewNotificationSchema = NotificationSchema.omit({ id: true, userId: true, createdAt: true });
export type NewNotification = z.infer<typeof NewNotificationSchema>;
export const NotificationPatchSchema = NewNotificationSchema.partial();
export type NotificationPatch = z.infer<typeof NotificationPatchSchema>;

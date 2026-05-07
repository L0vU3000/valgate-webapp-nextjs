import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const FolderSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  parentFolderId: z.string().min(1).optional(),
  name: z.string().min(1),
  createdAt: timestampSchema,
});

export type Folder = z.infer<typeof FolderSchema>;

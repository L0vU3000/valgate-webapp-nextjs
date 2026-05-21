import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const FolderSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  parentFolderId: z.string().min(1).optional(),
  name: z.string().min(1),
  createdAt: timestampSchema,
});

export type Folder = z.infer<typeof FolderSchema>;

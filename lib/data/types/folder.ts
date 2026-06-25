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

export const NewFolderSchema = FolderSchema.omit({ id: true, createdAt: true });
export type NewFolder = z.infer<typeof NewFolderSchema>;
export const FolderPatchSchema = NewFolderSchema.partial();
export type FolderPatch = z.infer<typeof FolderPatchSchema>;

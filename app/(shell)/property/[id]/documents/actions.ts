"use server";

import { uploadDocument } from "@/app/actions/documents";
import type { ActionResult } from "@/app/actions/_result";
import type { Document } from "@/lib/data/types/document";

export type UploadResult = { name: string; result: ActionResult<Document> };

export async function uploadMultipleDocuments(
  propertyId: string,
  formData: FormData,
): Promise<UploadResult[]> {
  const files = formData.getAll("files");
  const results: UploadResult[] = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadDocument(propertyId, fd);
    results.push({ name: file.name, result });
  }
  return results;
}

import { z } from "zod";
import { DOCUMENT_CATEGORIES } from "@/lib/api/v1/document-write";

export const DocumentsSummaryQuerySchema = z.object({
  kind: z.enum(["photo", "document"]).optional(),
});

export const OrgDocumentsQuerySchema = DocumentsSummaryQuerySchema.extend({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
  cursor: z.string().min(1).optional(),
  category: z.enum([...DOCUMENT_CATEGORIES, "uncategorized"]).optional(),
});

export type OrgDocumentsQuery = z.infer<typeof OrgDocumentsQuerySchema>;
export type DocumentsSummaryQuery = z.infer<typeof DocumentsSummaryQuerySchema>;

export function documentsQueryInput(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams);
}

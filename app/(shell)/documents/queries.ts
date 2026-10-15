import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import type { Ctx } from "@/lib/services/_mapping";
// Read through the cross-request cache layer, like the other shell routes.
// cachedListDocuments with no propertyId is already org-wide — the same call the
// per-property documents page makes, minus the property scope.
import { cachedListDocuments } from "@/lib/data/cached-reads";
import { listProperties } from "@/lib/services/properties";
import type { Document } from "@/lib/data/types/document";

export type DocumentsVaultPageData = {
  documents: Document[];
  // propertyId -> property name. A plain object, not a Map, because this crosses the
  // server/client boundary into the client page component.
  propertyNames: Record<string, string>;
};

export async function getDocumentsVaultPageData(ctxOverride?: Ctx): Promise<DocumentsVaultPageData> {
  const authCtx = ctxOverride ?? (await requireCtx());

  const [documents, properties] = await Promise.all([
    cachedListDocuments(authCtx),
    listProperties(authCtx),
  ]);

  const propertyNames = Object.fromEntries(properties.map((p) => [p.id, p.name]));

  return { documents, propertyNames };
}

import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import type { Ctx } from "@/lib/services/_mapping";
// Read through the cross-request cache layer, like the other shell routes.
// cachedListDocuments with no propertyId is already org-wide — the same call the
// per-property documents page makes, minus the property scope.
import { cachedListDocuments } from "@/lib/data/cached-reads";
import { listProperties } from "@/lib/services/properties";
import { listFolders } from "@/lib/services/folders";
import type { Document } from "@/lib/data/types/document";

export type VaultFolderCard = {
  id: string;
  name: string;
  // Folders are property-scoped, so a portfolio-wide list needs the property to tell
  // two same-named folders apart ("Title" exists on several properties).
  propertyName: string;
  count: number;
};

export type DocumentsVaultPageData = {
  documents: Document[];
  // propertyId -> property name. A plain object, not a Map, because this crosses the
  // server/client boundary into the client page component.
  propertyNames: Record<string, string>;
  // The grid's Folders section. Derived, never invented: a folder is listed only when
  // documents we already read actually point at it.
  folders: VaultFolderCard[];
};

export async function getDocumentsVaultPageData(ctxOverride?: Ctx): Promise<DocumentsVaultPageData> {
  const authCtx = ctxOverride ?? (await requireCtx());

  const [documents, properties, folders] = await Promise.all([
    cachedListDocuments(authCtx),
    listProperties(authCtx),
    listFolders(authCtx),
  ]);

  const propertyNames = Object.fromEntries(properties.map((p) => [p.id, p.name]));

  const counts = new Map<string, number>();
  for (const doc of documents) {
    if (!doc.folderId) continue;
    counts.set(doc.folderId, (counts.get(doc.folderId) ?? 0) + 1);
  }
  const folderCards = folders
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      propertyName: propertyNames[folder.propertyId] ?? folder.propertyId,
      count: counts.get(folder.id) ?? 0,
    }))
    .filter((folder) => folder.count > 0);

  return { documents, propertyNames, folders: folderCards };
}

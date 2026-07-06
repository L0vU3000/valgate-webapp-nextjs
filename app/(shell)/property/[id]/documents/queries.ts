import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { roleAtLeast } from "@/lib/services/_mapping";
import type { Ctx } from "@/lib/services/_mapping";
import { cachedListDocuments, cachedListFolders } from "@/lib/data/cached-reads";
import { resolveDocumentUrl } from "@/lib/services/storage";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

function isImageDoc(doc: { kind: string; name: string; extension?: string }): boolean {
  const ext = (doc.extension ?? doc.name.split(".").pop() ?? "").toLowerCase();
  return doc.kind === "photo" || IMAGE_EXTENSIONS.has(ext);
}

export async function getDocumentsPageData(propertyId: string, overrideCtx?: Ctx) {
  const authCtx = overrideCtx ?? await requireCtx();
  const [docs, folders] = await Promise.all([
    cachedListDocuments(authCtx, propertyId),
    cachedListFolders(authCtx, propertyId),
  ]);

  const imageDocs = docs.filter(isImageDoc);

  const docThumbUrls: Record<string, string> = Object.fromEntries(
    await Promise.all(
      imageDocs.map(async (d) => [
        d.id,
        await resolveDocumentUrl(d.thumbStorageId ?? d.storageId),
      ])
    )
  );

  return {
    userId: authCtx.userId,
    canDelete: roleAtLeast(authCtx.orgRole, "admin"),
    documents: docs,
    folders,
    docThumbUrls,
  };
}
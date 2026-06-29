import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { roleAtLeast } from "@/lib/services/_mapping";
import { cachedListDocuments, cachedListFolders } from "@/lib/data/cached-reads";
import { resolveDocumentUrl } from "@/lib/services/storage";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

function isImageDoc(doc: { kind: string; name: string; extension?: string }): boolean {
  const ext = (doc.extension ?? doc.name.split(".").pop() ?? "").toLowerCase();
  return doc.kind === "photo" || IMAGE_EXTENSIONS.has(ext);
}

// Both list calls pass propertyId so the WHERE clause filters at the DB level.
// The imageDocs filter is not a propertyId filter — it checks doc.kind/extension to
// identify images so their signed thumbnail URLs can be pre-resolved for the grid view.
export async function getDocumentsPageData(propertyId: string) {
  const authCtx = await requireCtx();
  const [docs, folders] = await Promise.all([
    cachedListDocuments(authCtx, propertyId),
    cachedListFolders(authCtx, propertyId),
  ]);

  const imageDocs = docs.filter(isImageDoc);

  // Resolve signed URLs for image documents only — used as grid thumbnails.
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
    // Whether this user may delete documents/folders. Mirrors the portfolio's
    // gate: only admin/owner can delete. The server already rejects deletes from
    // lower roles (scopedDelete requires admin, proven in tests/authz), so this
    // flag exists purely to HIDE the delete controls in the UI for viewer/member
    // — defence in depth, not the enforcement itself.
    canDelete: roleAtLeast(authCtx.orgRole, "admin"),
    documents: docs,
    folders,
    docThumbUrls,
  };
}

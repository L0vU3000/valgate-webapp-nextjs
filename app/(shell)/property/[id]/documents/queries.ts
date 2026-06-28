import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { roleAtLeast } from "@/lib/services/_mapping";
import { listDocuments } from "@/lib/services/documents";
import { listFolders } from "@/lib/services/folders";
import { resolveDocumentUrl } from "@/lib/services/storage";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

function isImageDoc(doc: { kind: string; name: string; extension?: string }): boolean {
  const ext = (doc.extension ?? doc.name.split(".").pop() ?? "").toLowerCase();
  return doc.kind === "photo" || IMAGE_EXTENSIONS.has(ext);
}

export async function getDocumentsPageData(propertyId: string) {
  const authCtx = await requireCtx();
  const [allDocs, allFolders] = await Promise.all([
    listDocuments(authCtx),
    listFolders(authCtx),
  ]);

  const docs = allDocs.filter((x) => x.propertyId === propertyId);
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
    // Server-computed capability: only admins (and above) may delete folders.
    // The client receives just this boolean — no role logic ships to the
    // browser, and the deleteFolder action remains the real enforcement point.
    canDeleteFolders: roleAtLeast(authCtx.orgRole, "admin"),
    documents: docs,
    folders: allFolders.filter((x) => x.propertyId === propertyId),
    docThumbUrls,
  };
}

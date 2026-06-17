import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listDocuments } from "@/lib/services/documents";
import { listFolders } from "@/lib/services/folders";

export async function getDocumentsPageData(propertyId: string) {
  const authCtx = await requireCtx();
  const [allDocs, allFolders] = await Promise.all([
    listDocuments(authCtx),
    listFolders(authCtx),
  ]);
  return {
    userId: authCtx.userId,
    documents: allDocs.filter((x) => x.propertyId === propertyId),
    folders: allFolders.filter((x) => x.propertyId === propertyId),
  };
}

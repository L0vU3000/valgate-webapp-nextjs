import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";

export async function getDocumentsPageData(propertyId: string) {
  const userId = getCurrentUserId();
  const [allDocs, allFolders] = await Promise.all([
    db.documents.list(userId),
    db.folders.list(userId),
  ]);
  return {
    userId,
    documents: allDocs.filter((x) => x.propertyId === propertyId),
    folders: allFolders.filter((x) => x.propertyId === propertyId),
  };
}

import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { roleAtLeast } from "@/lib/services/_mapping";
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
    // Whether this user may delete documents/folders. Mirrors the portfolio's
    // gate: only admin/owner can delete. The server already rejects deletes from
    // lower roles (scopedDelete requires admin, proven in tests/authz), so this
    // flag exists purely to HIDE the delete controls in the UI for viewer/member
    // — defence in depth, not the enforcement itself.
    canDelete: roleAtLeast(authCtx.orgRole, "admin"),
    documents: allDocs.filter((x) => x.propertyId === propertyId),
    folders: allFolders.filter((x) => x.propertyId === propertyId),
  };
}

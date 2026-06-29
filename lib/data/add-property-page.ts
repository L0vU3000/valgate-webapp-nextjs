import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listPropertyDrafts } from "@/lib/services/property-drafts";

/**
 * Server-only data for the add-property route. Returns the caller's own in-progress
 * drafts (personal, org+user scoped) so the page can render the "Resume a draft" list
 * on the server. The client's useDrafts hook re-fetches the full records after mount.
 */
export type PropertyDraftSummary = {
  id: string;
  title: string;
};

export async function getAddPropertyPageData(): Promise<{
  drafts: PropertyDraftSummary[];
}> {
  try {
    const ctx = await requireCtx();
    const drafts = await listPropertyDrafts(ctx);
    // Only the fields the list renders — never ship the full draft form server→client here.
    return { drafts: drafts.map((d) => ({ id: d.id, title: d.title })) };
  } catch (err) {
    // The wizard must still load even if drafts can't be fetched (e.g. transient DB error).
    console.error("getAddPropertyPageData", err);
    return { drafts: [] };
  }
}

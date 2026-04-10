/**
 * Server-only data for the add-property route.
 * Swap the implementation when drafts are loaded from the database or an API.
 */
export type PropertyDraftSummary = {
  id: string;
  title: string;
};

export async function getAddPropertyPageData(): Promise<{
  drafts: PropertyDraftSummary[];
}> {
  return { drafts: [] };
}

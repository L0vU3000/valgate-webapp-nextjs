import { TenantImportFlow } from "./_components/TenantImportFlow";

// Give the tenant-import Server Actions (mapTenantsAction, bulkCreateTenantsAction) room to run: the
// field-sourcing plan is a GPT-5.5 reasoning call that can take 10-30s, well past Vercel's default
// function timeout. Per Next.js, a page-level maxDuration governs all Server Actions used on the page.
export const maxDuration = 60;

// Bulk tenant importer. Sibling to /add-property/import (properties) — kept as its
// own route so the working property flow stays untouched. Both reuse the same
// dependency-free spreadsheet parsing; only the entity-specific mapping differs.
export default function Page() {
  return <TenantImportFlow />;
}

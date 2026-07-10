import { ValuationImportFlow } from "./_components/ValuationImportFlow";

// Give the valuation-import Server Actions (mapValuationsAction, bulkCreateValuationsAction) room to
// run: the field-sourcing plan is a GPT-5.5 reasoning call that can take 10-30s, well past Vercel's
// default function timeout. Per Next.js, a page-level maxDuration governs all Server Actions used on
// the page.
export const maxDuration = 60;

// Bulk valuation importer. Sibling to /add-property/import-tenants — kept as its own route so the
// working flows stay untouched. All three reuse the same dependency-free spreadsheet parsing and the
// same field-first engine; only the entity-specific mapping differs.
export default function Page() {
  return <ValuationImportFlow />;
}

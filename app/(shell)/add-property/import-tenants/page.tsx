import { TenantImportFlow } from "./_components/TenantImportFlow";

// Bulk tenant importer. Sibling to /add-property/import (properties) — kept as its
// own route so the working property flow stays untouched. Both reuse the same
// dependency-free spreadsheet parsing; only the entity-specific mapping differs.
export default function Page() {
  return <TenantImportFlow />;
}

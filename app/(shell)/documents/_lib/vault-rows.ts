// Pure derivations for the top-level Documents vault page.
//
// Everything the page says about a document — the table row shape, the file-type
// decision, the size/date strings, the metric totals — is derived here so it can
// be tested without a database or a React renderer. The component owns only
// layout and the lucide glyph that matches each file type. Nothing here invents a
// value: every field reads a `Document` field or formats one.

import { formatBytes, formatDate } from "@/lib/format";
import type { Document } from "@/lib/data/types/document";

// The icon families the row tile distinguishes. "pdf" and "doc" share the document
// glyph but not the tint, so they stay separate keys.
export type FileType = "image" | "spreadsheet" | "pdf" | "doc";

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  image: "Image",
  spreadsheet: "Spreadsheet",
  pdf: "PDF",
  doc: "Document",
};

// Tile tint per file type, applied over a 28x28 rounded square behind the glyph.
// Classes only — the glyph itself is chosen in the component so this module stays
// React-free.
export const FILE_TYPE_TILE_CLASS: Record<FileType, string> = {
  image: "bg-status-info-bg text-status-info",
  spreadsheet: "bg-status-success-bg text-status-success-text",
  pdf: "bg-status-danger-bg text-status-danger",
  doc: "bg-surface-tint text-secondary",
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "heic", "gif", "webp", "svg"]);
const SPREADSHEET_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);

function documentExtension(doc: Pick<Document, "name" | "extension">): string {
  return (doc.extension ?? doc.name.split(".").pop() ?? "").replace(/^\./, "").toLowerCase();
}

// Same decision as getFileIconStyle in PropertyDocumentsPage.tsx: the stored `kind`
// wins for photos, otherwise the extension decides.
export function fileTypeOf(doc: Pick<Document, "kind" | "name" | "extension">): FileType {
  const ext = documentExtension(doc);
  if (doc.kind === "photo" || IMAGE_EXTENSIONS.has(ext)) return "image";
  if (SPREADSHEET_EXTENSIONS.has(ext)) return "spreadsheet";
  if (ext === "pdf") return "pdf";
  return "doc";
}

// The tile communicates the file's stored extension, rather than a generic file
// family. A file without an extension stays honest about that absence.
export function fileExtensionLabel(doc: Pick<Document, "name" | "extension">): string {
  const extension = documentExtension(doc);
  return extension ? extension.toUpperCase() : "—";
}

// Labels for the document's own `category` column, keyed by the schema enum. A
// whitelist rather than a raw passthrough so a value the enum doesn't know about
// falls back to a readable label instead of leaking a machine string into the grid.
export const CATEGORY_LABELS: Record<string, string> = {
  Title: "Title",
  Rental: "Rental",
  Photos: "Photos",
  Legal: "Legal",
  Financial: "Financial",
  Estate: "Estate",
  Other: "Other",
};

export const UNCATEGORISED_LABEL = "Uncategorised";

export function categoryLabel(category?: string | null): string {
  return (category ? CATEGORY_LABELS[category] : undefined) ?? UNCATEGORISED_LABEL;
}

// The verifies chip. Keyed by the *type* of the schema enum rather than by string, so
// `Record<VerifiesEntityType, …>` fails typecheck the moment a new entity type is added
// to the schema — a hand-written `Record<string, …>` would silently fall through instead.
// Labels keep PropertyDocumentsPage.tsx's wording so the vault reads the same.
export type VerifiesEntityType = NonNullable<Document["verifies"]>["entityType"];

const VERIFIES_CHIP_CLASS = "bg-status-success-bg text-status-success-text";

export const VERIFIES_CHIP: Record<VerifiesEntityType, { label: string; cls: string }> = {
  "ownership-record": { label: "Verifies Ownership", cls: VERIFIES_CHIP_CLASS },
  "co-owner": { label: "Verifies Co-owner", cls: VERIFIES_CHIP_CLASS },
  inspection: { label: "Verifies Inspection", cls: VERIFIES_CHIP_CLASS },
  lease: { label: "Verifies Lease", cls: VERIFIES_CHIP_CLASS },
  valuation: { label: "Verifies Valuation", cls: VERIFIES_CHIP_CLASS },
  "estate-plan": { label: "Verifies Estate", cls: VERIFIES_CHIP_CLASS },
  "location-identity": { label: "Verifies Location", cls: VERIFIES_CHIP_CLASS },
  financials: { label: "Verifies Financials", cls: VERIFIES_CHIP_CLASS },
  rental: { label: "Verifies Rental", cls: VERIFIES_CHIP_CLASS },
};

// Only a document with no verifies link at all reads as unlinked. A document that DOES
// verify something must never show this — claiming an unlinked file would be a false
// statement about the record, which is worse than an empty cell.
export const UNVERIFIED_CHIP = { label: "Unlinked", cls: "bg-slate-100 text-slate-600" };

export function verifiesChip(
  entityType?: VerifiesEntityType | null,
): { label: string; cls: string } {
  return (entityType ? VERIFIES_CHIP[entityType] : undefined) ?? UNVERIFIED_CHIP;
}

export const UNKNOWN_SIZE_LABEL = "—";

// sizeBytes is optional in the schema (older rows predate the column), so an
// absent size reads as unknown rather than as zero bytes.
export function sizeLabel(sizeBytes?: number | null): string {
  return typeof sizeBytes === "number" ? formatBytes(sizeBytes) : UNKNOWN_SIZE_LABEL;
}

export type VaultMetrics = {
  count: number;
  storageBytes: number;
  storageLabel: string;
  propertyCount: number;
};

// The only two metrics the schema can prove: how many documents exist, and the sum
// of their recorded sizes. propertyCount feeds the count metric's sub-line.
export function computeMetrics(docs: Document[]): VaultMetrics {
  let storageBytes = 0;
  const propertyIds = new Set<string>();
  for (const doc of docs) {
    if (typeof doc.sizeBytes === "number") storageBytes += doc.sizeBytes;
    propertyIds.add(doc.propertyId);
  }
  return {
    count: docs.length,
    storageBytes,
    storageLabel: formatBytes(storageBytes),
    propertyCount: propertyIds.size,
  };
}

// Sub-line for the document-count metric: how many properties the documents span.
export function propertySpanLabel(propertyCount: number): string {
  if (propertyCount === 0) return "No properties yet";
  return `Across ${propertyCount} ${propertyCount === 1 ? "property" : "properties"}`;
}

export const UNKNOWN_PROPERTY_LABEL = "Unknown property";

export type VaultRow = {
  id: string;
  name: string;
  propertyId: string;
  propertyName: string;
  category: string;
  // The persisted verifies entity type, or null when the document links to nothing.
  // Kept alongside the label so renderers ask "does this verify anything?" instead of
  // pattern-matching the display string, which would break the moment the copy changes.
  verifiesEntityType: VerifiesEntityType | null;
  verifiesLabel: string;
  verifiesClass: string;
  fileType: FileType;
  fileTypeLabel: string;
  tileClass: string;
  size: string;
  uploaded: string;
};

// Documents keep the order the service returned them in. A document whose property
// is missing from the lookup still gets a row, named with a fallback, so a stale
// propertyId can never hide a real file.
export function buildRows(
  docs: Document[],
  propertyNames: Record<string, string>,
): VaultRow[] {
  return docs.map((doc) => {
    const fileType = fileTypeOf(doc);
    const chip = verifiesChip(doc.verifies?.entityType);
    return {
      id: doc.id,
      name: doc.name,
      propertyId: doc.propertyId,
      propertyName: propertyNames[doc.propertyId] ?? UNKNOWN_PROPERTY_LABEL,
      category: categoryLabel(doc.category),
      verifiesEntityType: doc.verifies?.entityType ?? null,
      verifiesLabel: chip.label,
      verifiesClass: chip.cls,
      fileType,
      fileTypeLabel: fileExtensionLabel(doc),
      tileClass: FILE_TYPE_TILE_CLASS[fileType],
      size: sizeLabel(doc.sizeBytes),
      uploaded: formatDate(doc.uploadedAt),
    };
  });
}

// A row belongs to its document's property, so the preview target must be built
// from both persisted IDs rather than from the vault route or a display label.
export function documentPreviewHref(row: Pick<VaultRow, "id" | "propertyId">): string {
  return `/property/${encodeURIComponent(row.propertyId)}/documents?doc=${encodeURIComponent(row.id)}`;
}

// Distinct category labels present in the rows, sorted, for the toolbar dropdown.
export function categoryOptions(rows: VaultRow[]): string[] {
  return [...new Set(rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
}

// Distinct properties present in the rows, keyed by id so the filter never collapses
// two properties that happen to share a name. Sorted by name for the dropdown.
export function propertyOptions(rows: VaultRow[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const row of rows) byId.set(row.propertyId, row.propertyName);
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Unit coverage for the Documents vault page's pure derivation module.
//
// No database, no React: every assertion below runs against buildRows /
// computeMetrics / the label helpers directly, so the page's numbers and labels
// are pinned without a renderer or a connection.

import { describe, it, expect } from "vitest";
import {
  buildRows,
  computeMetrics,
  categoryLabel,
  verifiesChip,
  VERIFIES_CHIP,
  fileTypeOf,
  fileExtensionLabel,
  documentPreviewHref,
  sizeLabel,
  propertySpanLabel,
  UNCATEGORISED_LABEL,
  UNKNOWN_SIZE_LABEL,
  UNKNOWN_PROPERTY_LABEL,
} from "@/app/(shell)/documents/_lib/vault-rows";
import type { Document } from "@/lib/data/types/document";

function doc(overrides: Partial<Document> & Pick<Document, "id" | "propertyId" | "name">): Document {
  return {
    kind: "document",
    storageId: `storage-${overrides.id}`,
    uploadedAt: Date.UTC(2026, 2, 14, 12, 0, 0),
    ...overrides,
  };
}

describe("buildRows", () => {
  it("builds rows from documents in the order given, resolving each property name", () => {
    const docs = [
      doc({ id: "a", propertyId: "p1", name: "title-deed.pdf" }),
      doc({ id: "b", propertyId: "p2", name: "lease.docx" }),
      doc({ id: "c", propertyId: "p1", name: "tax.xlsx" }),
    ];
    const rows = buildRows(docs, { p1: "Riverside Villa", p2: "Airport Warehouse" });

    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(rows.map((r) => r.name)).toEqual(["title-deed.pdf", "lease.docx", "tax.xlsx"]);
    expect(rows.map((r) => r.propertyName)).toEqual([
      "Riverside Villa",
      "Airport Warehouse",
      "Riverside Villa",
    ]);
  });

  it("falls back to a placeholder name when a document's property is missing from the lookup", () => {
    const rows = buildRows([doc({ id: "a", propertyId: "ghost", name: "orphan.pdf" })], {
      p1: "Riverside Villa",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].propertyName).toBe(UNKNOWN_PROPERTY_LABEL);
  });

  it("decides the file type from kind first, then the extension", () => {
    expect(fileTypeOf(doc({ id: "a", propertyId: "p1", name: "photo.heic", kind: "photo" }))).toBe("image");
    expect(fileTypeOf(doc({ id: "b", propertyId: "p1", name: "scan.png" }))).toBe("image");
    expect(fileTypeOf(doc({ id: "c", propertyId: "p1", name: "ledger.xlsx" }))).toBe("spreadsheet");
    expect(fileTypeOf(doc({ id: "d", propertyId: "p1", name: "deed.pdf" }))).toBe("pdf");
    expect(fileTypeOf(doc({ id: "e", propertyId: "p1", name: "notes.txt" }))).toBe("doc");
  });

  it("carries the uploaded date through as a human-readable string", () => {
    const rows = buildRows([doc({ id: "a", propertyId: "p1", name: "deed.pdf" })], { p1: "P" });
    expect(rows[0].uploaded).toMatch(/^\w{3} \d{1,2}, \d{4}$/);
  });

  it("keeps each persisted ID available for its property document preview target", () => {
    const [row] = buildRows(
      [doc({ id: "document-123", propertyId: "property-456", name: "deed.pdf" })],
      { "property-456": "Riverside Villa" },
    );

    expect(row).toMatchObject({ id: "document-123", propertyId: "property-456" });
    expect(documentPreviewHref(row)).toBe("/property/property-456/documents?doc=document-123");
  });

  it("uses the real stored file extension as the tile label", () => {
    expect(fileExtensionLabel(doc({ id: "a", propertyId: "p1", name: "photo.jpeg" }))).toBe("JPEG");
    expect(fileExtensionLabel(doc({ id: "b", propertyId: "p1", name: "ledger", extension: "csv" }))).toBe("CSV");
  });
});

describe("size formatting", () => {
  it("formats known sizes", () => {
    expect(sizeLabel(500)).toBe("500 B");
    expect(sizeLabel(2048)).toBe("2.0 KB");
    expect(sizeLabel(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("treats zero as a real, shown value", () => {
    expect(sizeLabel(0)).toBe("0 B");
  });

  it("treats a missing size as unknown, not as zero", () => {
    expect(sizeLabel(undefined)).toBe(UNKNOWN_SIZE_LABEL);
    expect(sizeLabel(null)).toBe(UNKNOWN_SIZE_LABEL);
  });
});

describe("computeMetrics", () => {
  it("sums count and storage across documents from several properties", () => {
    const docs = [
      doc({ id: "a", propertyId: "p1", name: "a.pdf", sizeBytes: 1024 }),
      doc({ id: "b", propertyId: "p2", name: "b.pdf", sizeBytes: 2048 }),
      doc({ id: "c", propertyId: "p1", name: "c.pdf", sizeBytes: 1024 }),
    ];
    const metrics = computeMetrics(docs);

    expect(metrics.count).toBe(3);
    expect(metrics.storageBytes).toBe(4096);
    expect(metrics.storageLabel).toBe("4.0 KB");
    expect(metrics.propertyCount).toBe(2);
  });

  it("skips documents with no recorded size but still counts them", () => {
    const docs = [
      doc({ id: "a", propertyId: "p1", name: "a.pdf", sizeBytes: 1024 }),
      doc({ id: "b", propertyId: "p2", name: "b.pdf" }),
    ];
    const metrics = computeMetrics(docs);

    expect(metrics.count).toBe(2);
    expect(metrics.storageBytes).toBe(1024);
    expect(metrics.propertyCount).toBe(2);
  });

  it("reports an empty vault honestly", () => {
    const metrics = computeMetrics([]);
    expect(metrics.count).toBe(0);
    expect(metrics.storageLabel).toBe("0 B");
    expect(metrics.propertyCount).toBe(0);
    expect(propertySpanLabel(metrics.propertyCount)).toBe("No properties yet");
  });

  it("pluralises the property span sub-line", () => {
    expect(propertySpanLabel(1)).toBe("Across 1 property");
    expect(propertySpanLabel(4)).toBe("Across 4 properties");
  });
});

describe("labels fall back safely", () => {
  it("category label falls back for an unknown or absent category", () => {
    expect(categoryLabel("Financial")).toBe("Financial");
    expect(categoryLabel("NotARealCategory")).toBe(UNCATEGORISED_LABEL);
    expect(categoryLabel(undefined)).toBe(UNCATEGORISED_LABEL);
    expect(categoryLabel(null)).toBe(UNCATEGORISED_LABEL);
  });

  it("gives every verifies entity type the schema defines its own chip, never 'Unlinked'", () => {
    // The schema's verifies.entityType enum. A document that verifies something must
    // never be labelled unlinked, so each member is asserted individually.
    const entityTypes = [
      "ownership-record",
      "co-owner",
      "inspection",
      "lease",
      "valuation",
      "estate-plan",
      "location-identity",
      "financials",
      "rental",
    ] as const;

    for (const entityType of entityTypes) {
      const chip = verifiesChip(entityType);
      expect(chip.label, entityType).toMatch(/^Verifies /);
      expect(chip.label, entityType).not.toBe("Unlinked");
    }
    expect(Object.keys(VERIFIES_CHIP)).toHaveLength(entityTypes.length);
    expect(verifiesChip("financials").label).toBe("Verifies Financials");
  });

  it("reads as unlinked only when there is no verifies link at all", () => {
    expect(verifiesChip(undefined).label).toBe("Unlinked");
    expect(verifiesChip(null).label).toBe("Unlinked");
    expect(verifiesChip(null).cls).toMatch(/bg-/);
  });
});

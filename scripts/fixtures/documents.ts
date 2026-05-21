import type { NewDocument } from "@/lib/data/db/documents";
import type { NewFolder } from "@/lib/data/db/folders";

const now = Date.UTC(2026, 3, 1);
const day = 24 * 60 * 60 * 1000;

export const folders: NewFolder[] = [
  { propertyId: "PROP-0001", name: "Title", createdAt: now - 365 * day },
  { propertyId: "PROP-0001", name: "Compliance", createdAt: now - 200 * day },
  { propertyId: "PROP-0006", name: "Rental", createdAt: now - 120 * day },
];

export const documents: NewDocument[] = [
  {
    propertyId: "PROP-0001",
    folderId: "FLDR-0001",
    name: "Title_Deed.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_240_000,
    storageId: "_storage/PROP-0001/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 360 * day,
  },
  {
    propertyId: "PROP-0001",
    folderId: "FLDR-0002",
    name: "Property_Photo_Exterior.jpg",
    kind: "photo",
    mimeType: "image/jpeg",
    extension: "jpg",
    sizeBytes: 3_812_000,
    storageId: "_storage/PROP-0001/exterior.jpg",
    category: "Photos",
    uploadedAt: now - 60 * day,
  },
  {
    propertyId: "PROP-0006",
    folderId: "FLDR-0003",
    name: "Lease_Agreement_2026.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 890_000,
    storageId: "_storage/PROP-0006/lease-2026.pdf",
    category: "Rental",
    uploadedAt: now - 30 * day,
  },
];

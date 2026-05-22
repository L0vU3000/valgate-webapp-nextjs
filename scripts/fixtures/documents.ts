import type { NewDocument } from "@/lib/data/db/documents";
import type { NewFolder } from "@/lib/data/db/folders";

const now = Date.UTC(2026, 3, 1);
const day = 24 * 60 * 60 * 1000;

// Folders are created in order — IDs assigned as FLDR-0001, FLDR-0002, etc.
export const folders: NewFolder[] = [
  { propertyId: "PROP-0001", name: "Title",      createdAt: now - 365 * day },  // FLDR-0001
  { propertyId: "PROP-0001", name: "Compliance", createdAt: now - 200 * day },  // FLDR-0002
  { propertyId: "PROP-0001", name: "Rental",     createdAt: now - 180 * day },  // FLDR-0003
  { propertyId: "PROP-0010", name: "Title",      createdAt: now - 300 * day },  // FLDR-0004
  { propertyId: "PROP-0010", name: "Rental",     createdAt: now - 120 * day },  // FLDR-0005
  { propertyId: "PROP-0011", name: "Title",      createdAt: now - 400 * day },  // FLDR-0006
  { propertyId: "PROP-0012", name: "Title",      createdAt: now - 380 * day },  // FLDR-0007
  { propertyId: "PROP-0013", name: "Title",      createdAt: now - 260 * day },  // FLDR-0008
  { propertyId: "PROP-0013", name: "Rental",     createdAt: now - 100 * day },  // FLDR-0009
  { propertyId: "PROP-0014", name: "Title",      createdAt: now - 250 * day },  // FLDR-0010
  { propertyId: "PROP-0017", name: "Title",      createdAt: now - 340 * day },  // FLDR-0011
  { propertyId: "PROP-0020", name: "Title",      createdAt: now - 90 * day },   // FLDR-0012
];

export const documents: NewDocument[] = [
  // PROP-0001 — Boeung Trabek
  {
    propertyId: "PROP-0001",
    folderId: "FLDR-0001",
    name: "Title_Deed_Boeung_Trabek.pdf",
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
    name: "Fire_Safety_Certificate_2026.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 520_000,
    storageId: "_storage/PROP-0001/fire-cert-2026.pdf",
    category: "Other",
    uploadedAt: now - 17 * day,
  },
  {
    propertyId: "PROP-0001",
    folderId: "FLDR-0003",
    name: "Lease_Agreement_Rith_Consultancy.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 890_000,
    storageId: "_storage/PROP-0001/lease-rith-2025.pdf",
    category: "Rental",
    uploadedAt: now - 210 * day,
  },
  {
    propertyId: "PROP-0001",
    folderId: "FLDR-0002",
    name: "Exterior_Photo.jpg",
    kind: "photo",
    mimeType: "image/jpeg",
    extension: "jpg",
    sizeBytes: 3_812_000,
    storageId: "_storage/PROP-0001/exterior.jpg",
    category: "Photos",
    uploadedAt: now - 60 * day,
  },

  // PROP-0010 — BKK1 191D
  {
    propertyId: "PROP-0010",
    folderId: "FLDR-0004",
    name: "Title_Deed_BKK1_191D.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_380_000,
    storageId: "_storage/PROP-0010/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 295 * day,
  },
  {
    propertyId: "PROP-0010",
    folderId: "FLDR-0005",
    name: "Lease_Agreement_Malis_Fashion.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_050_000,
    storageId: "_storage/PROP-0010/lease-malis-2025.pdf",
    category: "Rental",
    uploadedAt: now - 365 * day,
  },

  // PROP-0011 — BKK1 Corner Residence
  {
    propertyId: "PROP-0011",
    folderId: "FLDR-0006",
    name: "Title_Deed_BKK1_No35.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_620_000,
    storageId: "_storage/PROP-0011/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 395 * day,
  },
  {
    propertyId: "PROP-0011",
    folderId: "FLDR-0006",
    name: "Property_Photo_Exterior.jpg",
    kind: "photo",
    mimeType: "image/jpeg",
    extension: "jpg",
    sizeBytes: 4_200_000,
    storageId: "_storage/PROP-0011/exterior.jpg",
    category: "Photos",
    uploadedAt: now - 80 * day,
  },

  // PROP-0012 — BKK1 Family Home
  {
    propertyId: "PROP-0012",
    folderId: "FLDR-0007",
    name: "Title_Deed_BKK1_No223.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_480_000,
    storageId: "_storage/PROP-0012/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 375 * day,
  },

  // PROP-0013 — Chak Angre A
  {
    propertyId: "PROP-0013",
    folderId: "FLDR-0008",
    name: "Title_Deed_Chak_Angre_A.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_190_000,
    storageId: "_storage/PROP-0013/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 255 * day,
  },
  {
    propertyId: "PROP-0013",
    folderId: "FLDR-0009",
    name: "Lease_Agreement_Sovann_Holdings.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 780_000,
    storageId: "_storage/PROP-0013/lease-sovann-2025.pdf",
    category: "Rental",
    uploadedAt: now - 300 * day,
  },

  // PROP-0014 — Chak Angre B
  {
    propertyId: "PROP-0014",
    folderId: "FLDR-0010",
    name: "Title_Deed_Chak_Angre_B.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_220_000,
    storageId: "_storage/PROP-0014/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 245 * day,
  },

  // PROP-0017 — BKK1 Villa
  {
    propertyId: "PROP-0017",
    folderId: "FLDR-0011",
    name: "Title_Deed_BKK1_Villa_158.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_750_000,
    storageId: "_storage/PROP-0017/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 335 * day,
  },
  {
    propertyId: "PROP-0017",
    folderId: "FLDR-0011",
    name: "Villa_Exterior_Photo.jpg",
    kind: "photo",
    mimeType: "image/jpeg",
    extension: "jpg",
    sizeBytes: 5_100_000,
    storageId: "_storage/PROP-0017/exterior.jpg",
    category: "Photos",
    uploadedAt: now - 50 * day,
  },

  // PROP-0020 — Chroy Changvar Land
  {
    propertyId: "PROP-0020",
    folderId: "FLDR-0012",
    name: "Title_Deed_Chroy_Changvar_Land.pdf",
    kind: "document",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 2_100_000,
    storageId: "_storage/PROP-0020/title-deed.pdf",
    category: "Title",
    uploadedAt: now - 85 * day,
  },
];

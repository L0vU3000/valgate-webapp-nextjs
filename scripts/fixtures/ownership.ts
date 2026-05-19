import type { NewOwnershipDocument } from "@/lib/data/db/ownership-documents";
import type { NewOwnershipHistory } from "@/lib/data/db/ownership-history";

const now = Date.UTC(2026, 3, 1);

export const ownership: NewOwnershipDocument[] = [
  {
    propertyId: "PROP-0001",
    name: "Hard Title — Original Deed",
    type: "Hard Title",
    documentDate: 1646326800000,
    owner: "Chan Family Trust",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    name: "Hard Title — Transfer Deed",
    type: "Hard Title",
    documentDate: 1691773200000,
    owner: "Chan Family Trust",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0011",
    name: "Soft Title — BKK1 Land",
    type: "Soft Title",
    documentDate: 1705510800000,
    owner: "Chan Family Trust",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
];

export const ownershipHistory: NewOwnershipHistory[] = [
  {
    propertyId: "PROP-0001",
    eventDate: 1646326800000,
    text: "Acquired from Sok Holdings — hard title registered.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    eventDate: 1724000400000,
    text: "Title transferred to Chan Family Trust.",
    color: "#2563eb",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    eventDate: 1691773200000,
    text: "Acquired at auction; Hard title registered.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
];

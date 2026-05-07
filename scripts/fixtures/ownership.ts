import type { NewOwnershipDocument } from "@/lib/data/db/ownership-documents";
import type { NewOwnershipHistory } from "@/lib/data/db/ownership-history";

const now = Date.UTC(2026, 3, 1);

export const ownership: NewOwnershipDocument[] = [
  {
    propertyId: "PROP-0001",
    name: "Hard Title — Original Deed",
    type: "Hard Title",
    date: "Mar 04, 2022",
    owner: "Chan Family Trust",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    name: "Hard Title — Transfer Deed",
    type: "Hard Title",
    date: "Aug 12, 2023",
    owner: "Chan Family Trust",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0011",
    name: "Soft Title — BKK1 Land",
    type: "Soft Title",
    date: "Jan 18, 2024",
    owner: "Chan Family Trust",
    createdAt: now,
    updatedAt: now,
  },
];

export const ownershipHistory: NewOwnershipHistory[] = [
  {
    propertyId: "PROP-0001",
    date: "Mar 04, 2022",
    text: "Acquired from Sok Holdings — hard title registered.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    date: "Aug 19, 2024",
    text: "Title transferred to Chan Family Trust.",
    color: "#2563eb",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    date: "Aug 12, 2023",
    text: "Acquired at auction; Hard title registered.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
];

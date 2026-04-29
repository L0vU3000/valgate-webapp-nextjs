import type { NewSuccessor } from "@/lib/data/db/successors";

const now = Date.UTC(2026, 3, 1);

export const successors: NewSuccessor[] = [
  {
    name: "Sophea Chan",
    initials: "SC",
    relation: "Spouse",
    role: "primary",
    share: 75,
    verified: true,
    createdAt: now - 365 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
  {
    name: "Dara Chan",
    initials: "DC",
    relation: "Child",
    role: "contingent",
    share: 12.5,
    verified: true,
    createdAt: now - 365 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
  {
    name: "Chenda Chan",
    initials: "CC",
    relation: "Child",
    role: "contingent",
    share: 12.5,
    verified: false,
    createdAt: now - 200 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
];

import type { NewSuccessor } from "@/lib/data/db/successors";

const now = Date.UTC(2026, 3, 1);

export const successors: NewSuccessor[] = [
  {
    name: "Jennifer Lee",
    initials: "JL",
    relation: "Spouse",
    role: "primary",
    share: 75,
    verified: true,
    createdAt: now - 365 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
  {
    name: "Marcus Lee",
    initials: "ML",
    relation: "Child",
    role: "contingent",
    share: 12.5,
    verified: true,
    createdAt: now - 365 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
  {
    name: "Chloe Lee",
    initials: "CL",
    relation: "Child",
    role: "contingent",
    share: 12.5,
    verified: false,
    createdAt: now - 200 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
];

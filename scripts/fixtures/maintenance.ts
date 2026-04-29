import type { NewMaintenanceItem } from "@/lib/data/db/maintenance-items";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 3, 1);

export const maintenance: NewMaintenanceItem[] = [
  {
    propertyId: "PROP-0001",
    severity: "Emergency",
    title: "Burst pipe in kitchen — water shut off",
    status: "InProgress",
    createdAt: now - 1 * day,
  },
  {
    propertyId: "PROP-0006",
    severity: "Urgent",
    title: "Air-con unit not cooling — Unit 2B",
    status: "Open",
    createdAt: now - 4 * day,
  },
  {
    propertyId: "PROP-0011",
    severity: "Standard",
    title: "Repaint hallway baseboards",
    status: "Open",
    createdAt: now - 10 * day,
  },
];

import type { NewMaintenanceItem } from "@/lib/data/db/maintenance-items";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 3, 1);

export const maintenance: NewMaintenanceItem[] = [
  // PROP-0001 — Boeung Trabek (active emergency)
  {
    propertyId: "PROP-0001",
    severity: "Emergency",
    title: "Burst pipe — ground floor bathroom water shut off",
    status: "InProgress",
    createdAt: now - 1 * day,
  },
  {
    propertyId: "PROP-0001",
    severity: "Standard",
    title: "Repaint front entrance wall",
    status: "Open",
    createdAt: now - 14 * day,
  },

  // PROP-0010 — BKK1 191D
  {
    propertyId: "PROP-0010",
    severity: "Urgent",
    title: "Air-con unit not cooling — upper floor office",
    status: "Open",
    createdAt: now - 4 * day,
  },
  {
    propertyId: "PROP-0010",
    severity: "Standard",
    title: "Replace broken ceiling light fitting — 2nd floor",
    status: "Open",
    createdAt: now - 9 * day,
  },

  // PROP-0011 — BKK1 Corner Residence
  {
    propertyId: "PROP-0011",
    severity: "Standard",
    title: "Garden irrigation system leaking — check drip lines",
    status: "Open",
    createdAt: now - 6 * day,
  },

  // PROP-0012 — BKK1 Family Home
  {
    propertyId: "PROP-0012",
    severity: "Urgent",
    title: "Water heater making noise — possible pressure issue",
    status: "InProgress",
    createdAt: now - 3 * day,
  },
  {
    propertyId: "PROP-0012",
    severity: "Standard",
    title: "Re-grout master bathroom floor tiles",
    status: "Open",
    createdAt: now - 21 * day,
  },

  // PROP-0013 — Chak Angre A (active)
  {
    propertyId: "PROP-0013",
    severity: "Standard",
    title: "Repaint exterior facade",
    status: "Open",
    createdAt: now - 10 * day,
  },

  // PROP-0014 — Chak Angre B
  {
    propertyId: "PROP-0014",
    severity: "Urgent",
    title: "Roof tile replacement — south-facing section",
    status: "Open",
    createdAt: now - 7 * day,
  },

  // PROP-0017 — BKK1 Villa (vacant, prep work)
  {
    propertyId: "PROP-0017",
    severity: "Standard",
    title: "Deep clean and garden clearance before rental listing",
    status: "Open",
    createdAt: now - 12 * day,
  },

  // PROP-0018 — Camko City Condo
  {
    propertyId: "PROP-0018",
    severity: "Standard",
    title: "Re-seal bathroom window — east wall",
    status: "Open",
    createdAt: now - 18 * day,
  },
];

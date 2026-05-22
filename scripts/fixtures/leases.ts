import type { NewLease } from "@/lib/data/db/leases";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 3, 1); // 2026-04-01

export const leases: NewLease[] = [
  // Boeung Trabek Corner Building — 1-year commercial lease
  {
    propertyId: "PROP-0001",
    tenantId: "TEN-0001",
    unit: "Ground Floor",
    stage: "Signed",
    startDate: now - 210 * day,
    endDate: now + 155 * day,
    monthlyRent: 850,
    termMonths: 12,
    renewalStatus: "Auto-renew",
  },
  // BKK1 Commercial Building 191D — 2-year commercial lease
  {
    propertyId: "PROP-0010",
    tenantId: "TEN-0002",
    unit: "Full Building",
    stage: "Signed",
    startDate: now - 365 * day,
    endDate: now + 365 * day,
    monthlyRent: 2200,
    termMonths: 24,
    renewalStatus: "Pending decision",
  },
  // Chak Angre Building A — 1-year lease
  {
    propertyId: "PROP-0013",
    tenantId: "TEN-0003",
    unit: "Full Building",
    stage: "Approaching",
    startDate: now - 300 * day,
    endDate: now + 65 * day,
    monthlyRent: 1800,
    termMonths: 12,
    renewalStatus: "Under negotiation",
  },
  // Chak Angre Building B — 1-year lease
  {
    propertyId: "PROP-0014",
    tenantId: "TEN-0004",
    unit: "Full Building",
    stage: "Signed",
    startDate: now - 180 * day,
    endDate: now + 185 * day,
    monthlyRent: 2400,
    termMonths: 12,
    renewalStatus: "Auto-renew",
  },
  // Chak Angre Land Plot — land lease to Peng Huot group
  {
    propertyId: "PROP-0015",
    tenantId: "TEN-0005",
    unit: "Full Plot",
    stage: "Offered",
    startDate: now + 30 * day,
    endDate: now + 30 * day + 365 * day,
    monthlyRent: 1200,
    termMonths: 12,
  },
];

import type { NewLease } from "@/lib/data/db/leases";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 3, 1); // 2026-04-01

export const leases: NewLease[] = [
  {
    propertyId: "PROP-0001",
    tenantId: "TEN-0001",
    unit: "Unit 1A",
    stage: "Signed",
    startDate: now - 180 * day,
    endDate: now + 185 * day,
    monthlyRent: 850,
    termMonths: 12,
    renewalStatus: "Auto-renew",
  },
  {
    propertyId: "PROP-0006",
    tenantId: "TEN-0002",
    unit: "Unit 2B",
    stage: "Approaching",
    startDate: now - 330 * day,
    endDate: now + 35 * day,
    monthlyRent: 1200,
    termMonths: 12,
    renewalStatus: "Pending decision",
  },
  {
    propertyId: "PROP-0011",
    tenantId: "TEN-0003",
    unit: "Penthouse",
    stage: "Offered",
    startDate: now + 30 * day,
    endDate: now + 30 * day + 365 * day,
    monthlyRent: 2500,
    termMonths: 12,
  },
];

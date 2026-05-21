import type { NewPropertyValuation } from "@/lib/data/db/property-valuations";

const now = Date.UTC(2026, 3, 1);

export const valuations: NewPropertyValuation[] = [
  {
    propertyId: "PROP-0001",
    month: "Jan 2026",
    price: 1_278_000,
    recordedAt: Date.UTC(2026, 0, 31),
  },
  {
    propertyId: "PROP-0001",
    month: "Feb 2026",
    price: 1_295_000,
    recordedAt: Date.UTC(2026, 1, 28),
  },
  {
    propertyId: "PROP-0001",
    month: "Mar 2026",
    price: 1_310_000,
    recordedAt: now,
  },
];

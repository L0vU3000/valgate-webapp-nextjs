import type { NewTenant } from "@/lib/data/db/tenants";

export const tenants: NewTenant[] = [
  {
    propertyId: "PROP-0001",
    name: "Sok Dara",
    unit: "Unit 1A",
    rent: 850,
    status: "Paid",
    email: "sok.dara@example.com",
    phone: "+855 12 345 678",
  },
  {
    propertyId: "PROP-0006",
    name: "Lim Vichea",
    unit: "Unit 2B",
    rent: 1200,
    status: "Overdue",
    email: "lim.vichea@example.com",
    phone: "+855 12 345 679",
  },
  {
    propertyId: "PROP-0011",
    name: "Chan Soriya",
    unit: "Penthouse",
    rent: 2500,
    status: "Pending",
    email: "chan.soriya@example.com",
    phone: "+855 12 345 680",
  },
];

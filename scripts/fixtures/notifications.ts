import type { NewNotification } from "@/lib/data/db/notifications";

const minute = 60 * 1000;
const hour = 60 * minute;
const now = Date.UTC(2026, 3, 1, 9, 0, 0);

export const notifications: NewNotification[] = [
  {
    category: "MAINTENANCE",
    title: "Burst pipe at PP00016",
    description: "Emergency plumber dispatched. Water mains shut off.",
    createdAt: now - 30 * minute,
    read: false,
    linkTo: "/property/PROP-0001/safety",
  },
  {
    category: "PAYMENT",
    title: "Rent overdue — Unit 2B",
    description: "Lim Vichea is 5 days late on the April rent.",
    createdAt: now - 4 * hour,
    read: false,
    linkTo: "/property/PROP-0006/rental",
  },
  {
    category: "LEASING",
    title: "Lease offer sent",
    description: "Penthouse offer queued for Chan Soriya. Awaiting signature.",
    createdAt: now - 26 * hour,
    read: true,
    linkTo: "/property/PROP-0011/rental",
  },
  {
    category: "COMPLIANCE",
    title: "Fire safety certificate expiring",
    description: "PP00016 PH certificate expires in 30 days.",
    createdAt: now - 3 * 24 * hour,
    read: true,
  },
  {
    category: "APPLICATIONS",
    title: "New tenant application",
    description: "Application received for Toul Kork Urban Parcel.",
    createdAt: now - 6 * 24 * hour,
    read: false,
  },
];

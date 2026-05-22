import type { NewNotification } from "@/lib/data/db/notifications";

const minute = 60 * 1000;
const hour = 60 * minute;
const now = Date.UTC(2026, 3, 1, 9, 0, 0);

export const notifications: NewNotification[] = [
  {
    category: "MAINTENANCE",
    title: "Burst pipe at Boeung Trabek Building",
    description: "Emergency plumber dispatched. Ground floor water mains shut off.",
    createdAt: now - 30 * minute,
    read: false,
    linkTo: "/property/PROP-0001/safety",
  },
  {
    category: "PAYMENT",
    title: "Rent overdue — BKK1 Building 191D",
    description: "Malis Fashion Co. is 5 days late on the April rent ($2,200).",
    createdAt: now - 4 * hour,
    read: false,
    linkTo: "/property/PROP-0010/rental",
  },
  {
    category: "LEASING",
    title: "Land lease offer sent — Chak Angre Plot",
    description: "Lease offer queued for Peng Huot Group. Awaiting signature.",
    createdAt: now - 26 * hour,
    read: true,
    linkTo: "/property/PROP-0015/rental",
  },
  {
    category: "COMPLIANCE",
    title: "Electrical certificate expiring — BKK1 191D",
    description: "Electrical compliance certificate expires in 30 days.",
    createdAt: now - 3 * 24 * hour,
    read: true,
  },
  {
    category: "APPLICATIONS",
    title: "New tenant application received",
    description: "Application received for Chak Angre Building A renewal.",
    createdAt: now - 6 * 24 * hour,
    read: false,
  },
];

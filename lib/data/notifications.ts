export type NotificationCategory =
  | "MAINTENANCE"
  | "LEASING"
  | "COMPLIANCE"
  | "PAYMENT"
  | "APPLICATIONS";

export interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: number; // Unix ms timestamp — format in the UI with formatRelativeTime()
  read: boolean;
  linkTo?: string;   // future: navigate on click
}

const now = Date.now();

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    category: "MAINTENANCE",
    title: "New maintenance request",
    description: "Unit 3B • Water leak reported in bathroom",
    createdAt: now - 2 * 60 * 1000,
    read: false,
  },
  {
    id: "2",
    category: "LEASING",
    title: "Lease expiring soon",
    description: "Sunset Apartments • 3 leases up for renewal · Q3",
    createdAt: now - 45 * 60 * 1000,
    read: false,
  },
  {
    id: "3",
    category: "COMPLIANCE",
    title: "Safety inspection due",
    description: "124 Oak St. • Annual fire marshal audit",
    createdAt: now - 2 * 60 * 60 * 1000,
    read: false,
  },
  {
    id: "4",
    category: "PAYMENT",
    title: "Rent payment received",
    description: "124 Oak St. • $2,450.00 processed successfully",
    createdAt: now - 24 * 60 * 60 * 1000,
    read: true,
  },
  {
    id: "5",
    category: "APPLICATIONS",
    title: "Tenant application received",
    description: "Unit 7A • James Wilson · Credit score: 780",
    createdAt: new Date("2026-02-14").getTime(),
    read: true,
  },
];

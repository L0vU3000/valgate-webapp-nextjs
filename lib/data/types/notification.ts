export type NotificationCategory =
  | "MAINTENANCE"
  | "LEASING"
  | "COMPLIANCE"
  | "PAYMENT"
  | "APPLICATIONS";

export interface Notification {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: number;
  read: boolean;
  linkTo?: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  eventType: string;
  email: boolean;
  slack: boolean;
  sms: boolean;
  createdAt: number;
  updatedAt: number;
}

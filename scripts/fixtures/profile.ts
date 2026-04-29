import type { UserProfile } from "@/lib/data/types/user-profile";
import type { NewNotificationPreference } from "@/lib/data/db/notification-preferences";

const now = Date.UTC(2026, 3, 1);

export const userProfile: Partial<UserProfile> = {
  firstName: "Ratanak",
  lastName: "Ly",
  jobTitle: "Portfolio Manager",
  employeeId: "EMP-0421",
  email: "ratanak@valgate.example",
  phone: "+855 12 000 4421",
  officeLocation: "Phnom Penh HQ",
  language: "English",
  timezone: "Asia/Phnom_Penh",
  currency: "USD",
  role: "Owner",
  memberSince: Date.UTC(2024, 0, 15),
  lastLogin: now,
};

export const notificationPreferences: NewNotificationPreference[] = [
  {
    eventType: "Maintenance",
    email: true,
    slack: true,
    sms: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    eventType: "Payment",
    email: true,
    slack: false,
    sms: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    eventType: "Compliance",
    email: true,
    slack: true,
    sms: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    eventType: "Leasing",
    email: false,
    slack: true,
    sms: false,
    createdAt: now,
    updatedAt: now,
  },
];

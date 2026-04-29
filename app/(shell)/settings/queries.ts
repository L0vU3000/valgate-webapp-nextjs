import "server-only";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";

export type NotificationRow = {
  key: string;
  label: string;
  description: string;
};

export type NotifChannels = { email: boolean; slack: boolean; sms: boolean };

export type SelectOption = { value: string; label: string };

export type SettingsPageData = {
  notificationRows: NotificationRow[];
  defaultNotifications: Record<string, NotifChannels>;
  dashboardViewOptions: SelectOption[];
  languageOptions: SelectOption[];
  timezoneOptions: SelectOption[];
  defaults: {
    dashboardView: string;
    language: string;
    timezone: string;
  };
};

const NOTIFICATION_ROWS: NotificationRow[] = [
  { key: "valuationUpdates", label: "Property Valuation Updates", description: "When an asset value changes significantly" },
  { key: "teamComments", label: "Team Comments", description: "When a team member mentions you" },
  { key: "marketInsights", label: "Market Insights", description: "Weekly summary of market trends" },
];

const HARD_DEFAULTS: Record<string, NotifChannels> = {
  valuationUpdates: { email: true, slack: true, sms: false },
  teamComments: { email: true, slack: true, sms: true },
  marketInsights: { email: true, slack: false, sms: false },
};

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const userId = getCurrentUserId();
  const storedPrefs = await db.notificationPreferences.list(userId);

  const defaultNotifications: Record<string, NotifChannels> = { ...HARD_DEFAULTS };
  for (const pref of storedPrefs) {
    defaultNotifications[pref.eventType] = {
      email: pref.email,
      slack: pref.slack,
      sms: pref.sms,
    };
  }

  return {
    notificationRows: NOTIFICATION_ROWS,
    defaultNotifications,
    dashboardViewOptions: [
      { value: "portfolio-overview", label: "Portfolio Overview" },
      { value: "analytics", label: "Analytics" },
      { value: "map", label: "Map View" },
    ],
    languageOptions: [
      { value: "en-US", label: "English (US)" },
      { value: "km", label: "Khmer" },
      { value: "zh", label: "Chinese" },
    ],
    timezoneOptions: [
      { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
      { value: "America/Chicago", label: "(GMT-06:00) Central Time (US & Canada)" },
      { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
      { value: "Asia/Phnom_Penh", label: "(GMT+07:00) Phnom Penh" },
      { value: "Asia/Singapore", label: "(GMT+08:00) Singapore" },
    ],
    defaults: {
      dashboardView: "portfolio-overview",
      language: "en-US",
      timezone: "America/New_York",
    },
  };
}

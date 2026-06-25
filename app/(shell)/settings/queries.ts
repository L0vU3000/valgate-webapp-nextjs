import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listNotificationPreferences } from "@/lib/services/notification-preferences";
import { getMyUserProfile } from "@/lib/services/user-profiles";
import { type UserProfile } from "@/lib/data/types/user-profile";
import { roleAtLeast } from "@/lib/services/_mapping";
import {
  getInviteCode,
  listAccessRequestsForOwner,
  listManagersForOwner,
  type PendingRequest,
  type GrantedManager,
} from "@/lib/services/managers";

export type { PendingRequest, GrantedManager };

export type NotificationRow = {
  key: string;
  label: string;
  description: string;
};

export type NotifChannels = { email: boolean; slack: boolean; sms: boolean };

export type SelectOption = { value: string; label: string };

export type ManagersData = {
  inviteCode: string | null;
  pendingRequests: PendingRequest[];
  managersWithAccess: GrantedManager[];
};

export type SettingsPageData = {
  profile: Pick<UserProfile, "firstName" | "lastName" | "email" | "jobTitle" | "role" | "phone"> | null;
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
  // Only present for org owners/admins. Null for viewers/members.
  managersData: ManagersData | null;
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
  const authCtx = await requireCtx();
  const storedPrefs = await listNotificationPreferences(authCtx);
  const profile = await getMyUserProfile(authCtx);

  const defaultNotifications: Record<string, NotifChannels> = { ...HARD_DEFAULTS };
  for (const pref of storedPrefs) {
    defaultNotifications[pref.eventType] = {
      email: pref.email,
      slack: pref.slack,
      sms: pref.sms,
    };
  }

  // Managers section is only shown to org owners/admins.
  // Viewers and members get null — the section is hidden entirely.
  let managersData: ManagersData | null = null;
  if (roleAtLeast(authCtx.orgRole, "admin")) {
    const [inviteCode, pendingRequests, managersWithAccess] = await Promise.all([
      getInviteCode(authCtx).catch(() => null),
      listAccessRequestsForOwner(authCtx).catch(() => []),
      listManagersForOwner(authCtx).catch(() => []),
    ]);
    managersData = { inviteCode, pendingRequests, managersWithAccess };
  }

  return {
    profile,
    notificationRows: NOTIFICATION_ROWS,
    defaultNotifications,
    managersData,
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
      dashboardView: profile?.dashboardView ?? "portfolio-overview",
      language: profile?.language ?? "en-US",
      timezone: profile?.timezone ?? "Asia/Phnom_Penh",
    },
  };
}

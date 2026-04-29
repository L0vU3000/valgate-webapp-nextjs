import "server-only";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";

export type ProfileField = {
  label: string;
  value: string;
};

export type ProfileFieldWithIcon = ProfileField & {
  iconKey: "Mail" | "Phone" | "MapPin";
};

export type ProfilePageData = {
  initials: string;
  fullName: string;
  role: string;
  memberSince: string;
  lastLogin: string;
  personalInfo: ProfileField[];
  contactFields: ProfileFieldWithIcon[];
  preferences: ProfileField[];
  securityNote: string;
};

export async function getProfilePageData(): Promise<ProfilePageData> {
  const userId = getCurrentUserId();
  const profile = await db.userProfiles.get(userId, userId);

  const firstName = profile?.firstName ?? "Samuel";
  const lastName = profile?.lastName ?? "Miller";
  const fullName = `${firstName} ${lastName}`;
  const initials = `${firstName[0] ?? "S"}${lastName[0] ?? "M"}`;

  return {
    initials,
    fullName,
    role: profile?.role ?? "Administrator",
    memberSince: profile?.memberSince
      ? new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Oct 12, 2021",
    lastLogin: profile?.lastLogin
      ? new Date(profile.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "2 hours ago",
    personalInfo: [
      { label: "First Name", value: firstName },
      { label: "Last Name", value: lastName },
      { label: "Job Title", value: profile?.jobTitle ?? "Senior Asset Manager" },
      { label: "Employee ID", value: profile?.employeeId ?? "VAL-88291" },
    ],
    contactFields: [
      { label: "Email Address", value: profile?.email ?? "s.miller@valgate-pm.com", iconKey: "Mail" },
      { label: "Phone Number", value: profile?.phone ?? "+1 (555) 234-5678", iconKey: "Phone" },
      { label: "Office Location", value: profile?.officeLocation ?? "London HQ, Floor 12", iconKey: "MapPin" },
    ],
    preferences: [
      { label: "Language", value: profile?.language ?? "English (UK)" },
      { label: "Timezone", value: profile?.timezone ?? "(GMT+00:00) London" },
      { label: "Currency", value: profile?.currency ?? "GBP (£)" },
    ],
    securityNote: "Your profile is currently secure. To maintain high account safety, we recommend changing your password every 90 days. Next change suggested by Jan 15, 2024.",
  };
}

import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { getUserProfile } from "@/lib/services/user-profiles";
import { type UserProfile } from "@/lib/data/types/user-profile";

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
  rawProfile: Partial<UserProfile>;
};

export async function getProfilePageData(): Promise<ProfilePageData> {
  const authCtx = await requireCtx();
  const profile = await getUserProfile(authCtx, authCtx.userId);

  const firstName = profile?.firstName || "—";
  const lastName = profile?.lastName || "—";
  const fullName = profile?.firstName && profile?.lastName ? `${profile.firstName} ${profile.lastName}` : "—";
  const initials = profile?.firstName && profile?.lastName ? `${profile.firstName[0]}${profile.lastName[0]}` : "—";

  return {
    initials,
    fullName,
    role: profile?.role || "—",
    memberSince: profile?.memberSince
      ? new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    lastLogin: profile?.lastLogin
      ? new Date(profile.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    personalInfo: [
      { label: "First Name", value: profile?.firstName || "—" },
      { label: "Last Name", value: profile?.lastName || "—" },
      { label: "Job Title", value: profile?.jobTitle || "—" },
      { label: "Employee ID", value: profile?.employeeId || "—" },
    ],
    contactFields: [
      { label: "Email Address", value: profile?.email || "—", iconKey: "Mail" },
      { label: "Phone Number", value: profile?.phone || "—", iconKey: "Phone" },
      { label: "Office Location", value: profile?.officeLocation || "—", iconKey: "MapPin" },
    ],
    preferences: [
      { label: "Language", value: profile?.language || "—" },
      { label: "Timezone", value: profile?.timezone || "—" },
      { label: "Currency", value: profile?.currency || "—" },
    ],
    securityNote: "Your profile is currently secure. To maintain high account safety, we recommend changing your password every 90 days. Next change suggested by Jan 15, 2024.",
    rawProfile: profile || {},
  };
}

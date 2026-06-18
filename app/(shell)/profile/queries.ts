import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { requireCtx } from "@/lib/auth/ctx";
import { getMyUserProfile } from "@/lib/services/user-profiles";
import { type UserProfile } from "@/lib/data/types/user-profile";

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatDate(v: string | number | null | undefined): string {
  return v
    ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
}

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
  const [profile, clerkUser] = await Promise.all([getMyUserProfile(authCtx), currentUser()]);

  // A brand-new sign-up has an identity (Clerk) but no user_profiles row yet, so fall back to the
  // Clerk identity for the core fields. Editing the profile creates the row (upsertUserProfile).
  const firstName = profile?.firstName || clerkUser?.firstName || "";
  const lastName = profile?.lastName || clerkUser?.lastName || "";
  const email = profile?.email || clerkUser?.emailAddresses?.[0]?.emailAddress || "";
  const role = profile?.role || titleCase(authCtx.orgRole);
  const memberSince = profile?.memberSince ?? clerkUser?.createdAt;
  const lastLogin = profile?.lastLogin ?? clerkUser?.lastSignInAt;

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "—";
  const initials =
    ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() ||
    (email[0]?.toUpperCase() ?? "—");

  return {
    initials,
    fullName,
    role: role || "—",
    memberSince: formatDate(memberSince),
    lastLogin: formatDate(lastLogin),
    personalInfo: [
      { label: "First Name", value: firstName || "—" },
      { label: "Last Name", value: lastName || "—" },
      { label: "Job Title", value: profile?.jobTitle || "—" },
      { label: "Employee ID", value: profile?.employeeId || "—" },
    ],
    contactFields: [
      { label: "Email Address", value: email || "—", iconKey: "Mail" },
      { label: "Phone Number", value: profile?.phone || "—", iconKey: "Phone" },
      { label: "Office Location", value: profile?.officeLocation || "—", iconKey: "MapPin" },
    ],
    preferences: [
      { label: "Language", value: profile?.language || "—" },
      { label: "Timezone", value: profile?.timezone || "—" },
      { label: "Currency", value: profile?.currency || "—" },
    ],
    securityNote: "Your profile is currently secure. To maintain high account safety, we recommend changing your password every 90 days. Next change suggested by Jan 15, 2024.",
    // Pre-fill the edit form with the Clerk-derived core fields so the user doesn't re-type them.
    rawProfile: { ...(profile ?? {}), firstName, lastName, email, role },
  };
}

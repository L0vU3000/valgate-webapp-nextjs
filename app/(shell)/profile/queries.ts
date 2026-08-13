import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { requireCtx } from "@/lib/auth/ctx";
import { env } from "@/lib/env";
import { getMyUserProfile } from "@/lib/services/user-profiles";
import { type UserProfile } from "@/lib/data/types/user-profile";
import { buildProfilePresentation, type ProfileField, type ProfileFieldWithIcon } from "./presentation";

export type { ProfileField, ProfileFieldWithIcon };

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatDate(v: string | number | null | undefined): string {
  return v
    ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
}

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
  // currentUser() invokes Clerk's auth(), which throws when clerkMiddleware
  // isn't active — e.g. DEMO_MODE, where resolveCtx() returns DEMO_CTX and never
  // calls auth(). This loader now runs on every /settings visit (Profile was
  // folded into the settings shell), so guard it: in demo mode skip currentUser()
  // and rely on the profile row + defaults instead of the Clerk identity.
  const [profile, clerkUser] = await Promise.all([
    getMyUserProfile(authCtx),
    env.DEMO_MODE ? Promise.resolve(null) : currentUser(),
  ]);

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

  const presentation = buildProfilePresentation({
    firstName,
    lastName,
    email,
    phone: profile?.phone,
    language: profile?.language,
    timezone: profile?.timezone,
    currency: profile?.currency,
  });

  return {
    initials,
    fullName,
    role: role || "—",
    memberSince: formatDate(memberSince),
    lastLogin: formatDate(lastLogin),
    ...presentation,
    // Pre-fill the edit form with the Clerk-derived core fields so the user doesn't re-type them.
    rawProfile: { ...(profile ?? {}), firstName, lastName, email, role },
  };
}

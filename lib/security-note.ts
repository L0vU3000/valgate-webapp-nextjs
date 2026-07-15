// Derives the account-security advisory shown on the /settings Profile banner.
//
// The 90-day password-rotation cadence is a fixed policy; the "Next change suggested by"
// date is derived from a real account timestamp (the user's last login, falling back to
// when they became a member) — never a hardcoded literal. When the profile carries no such
// timestamp yet, the date sentence is left off rather than invented.

export const PASSWORD_ROTATION_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// Accepts the shapes `memberSince`/`lastLogin` arrive in: epoch ms from the user_profiles
// row, or a Date from the Clerk identity fallback. Returns null for anything unusable.
function toMillis(value: number | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(ms) ? ms : null;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildSecurityNote(anchors: {
  lastLogin?: number | Date | null;
  memberSince?: number | Date | null;
}): string {
  const base =
    `Your profile is currently secure. To keep your account safe, we recommend changing ` +
    `your password every ${PASSWORD_ROTATION_DAYS} days.`;

  const anchorMs = toMillis(anchors.lastLogin) ?? toMillis(anchors.memberSince);
  if (anchorMs === null) return base;

  const nextChange = formatDate(anchorMs + PASSWORD_ROTATION_DAYS * DAY_MS);
  return `${base} Next change suggested by ${nextChange}.`;
}

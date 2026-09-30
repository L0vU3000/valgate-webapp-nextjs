// Refuse TRUNCATE/seed:reset/backfill against URLs that look like prod/staging unless explicitly
// overridden.
//
// The word check alone was not enough, and it failed in production: Neon generates branch hosts
// like `ep-wild-violet-aot0pvt7`, which contains none of "prod"/"production"/"staging", so a
// backfill against the live PRODUCTION branch passed the guard and moved 41 real pins. The rule
// now also blocks any URL naming a branch we know is production.
//
// A hosted URL cannot simply be treated as unsafe: the ordinary dev branch is hosted on Neon too
// (`ep-tiny-rice-…`). So this blocks the KNOWN production branch, not "anything remote".
const BLOCKED = ["prod", "production", "staging", "wild-violet"] as const;

export function assertSafeDatabaseUrl(url: string, action: string): void {
  if (process.env.ALLOW_DESTRUCTIVE_DB === "1") return;

  const lower = url.toLowerCase();
  for (const token of BLOCKED) {
    if (lower.includes(token)) {
      throw new Error(
        `Refusing ${action}: DATABASE_URL looks non-dev ("${token}" in URL). ` +
          "Point .env.local at a dev/test branch or set ALLOW_DESTRUCTIVE_DB=1 to override.",
      );
    }
  }
}

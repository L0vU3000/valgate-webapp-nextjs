// Refuse TRUNCATE/seed:reset against URLs that look like prod/staging unless explicitly overridden.
const BLOCKED = ["prod", "production", "staging"] as const;

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

import { config } from "dotenv";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Vitest config for LIVE-DB integration tests (`*.db.test.ts`).
//
// These connect to the real dev/preview Neon branch via the Drizzle client, so they
// need the env from .env.local (DATABASE_URL, STORAGE_*, NEXT_PUBLIC_* — the t3-env
// boundary validates them on import). Loading it here puts those vars in process.env
// before any test module — and before lib/env.ts — evaluates.
//
// Run with `npm run test:db`. The suite itself is gated on DATABASE_URL (describe.skipIf),
// so it no-ops cleanly if the var is absent (e.g. CI without secrets). The default
// `npm test` suite excludes this glob entirely, so it never touches the database.
config({ path: ".env.local" });

// Gate at the config level, not just via describe.skipIf: when DATABASE_URL is absent the test
// file would crash on IMPORT (lib/env validation requires it, and that throws before any test
// body runs). So we simply don't include the glob without a database, and passWithNoTests keeps
// the run a clean exit-0 no-op. With a database present, the glob runs normally.
const hasDb = !!process.env.DATABASE_URL;

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Same server-only no-op stub the default config uses, so server modules import
      // outside a Next server bundle. The DB client underneath is still the real one.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    name: "db",
    environment: "node",
    globals: true,
    include: hasDb ? ["**/*.db.test.ts"] : [],
    passWithNoTests: true,
  },
});

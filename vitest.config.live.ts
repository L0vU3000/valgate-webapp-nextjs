import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Vitest config for the LIVE Jev tests.
//
// Split from the default suite for the same reason as vitest.config.db.ts: these call a paid API
// and need a real key, so they must never run in `npm test` or CI, where they would fail (no key)
// or silently spend money.
//
//   npx vitest run --config vitest.config.live.ts
//
// Needs OPENROUTER_API_KEY in .env.local (`npm run env:sync dev`).
//
// NOTE: deliberately does NOT use ./test/setup/env.ts. That file neutralises every
// third-party credential (including OPENROUTER_API_KEY, see its list) so the default suite can
// never make a network call. Reusing it here blanked the key and every decision came back null —
// which looks exactly like "Jev is broken" rather than "the harness removed the key". Load
// .env.local here instead, exactly as vitest.config.db.ts does for DATABASE_URL.
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    env: { NODE_ENV: "test" },
    include: ["**/*.live.test.ts"],
    // Two vars are non-optional in lib/env.ts (t3-env validates at import time), so a missing
    // .env.local still needs inert placeholders — same contract as the default suite.
    setupFiles: ["./test/setup/env-live.ts"],
  },
});

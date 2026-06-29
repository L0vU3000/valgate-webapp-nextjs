import { defineConfig, configDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Vitest config for the query-layer integration tests.
//
// These are node-environment tests (no jsdom, no React rendering). They run
// the real Pro query functions against the committed seed under
// `public/data`, with the clock pinned by test/helpers.ts.
export default defineConfig({
  // tsconfigPaths reads the `@/* -> ./*` alias straight from tsconfig.json so
  // the query code's `@/lib/...` imports resolve without restating them here.
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // The data layer imports `server-only`, which throws on import outside a
      // server bundle. Point it at an empty stub so the import is a no-op.
      // (Same trick the seed script achieves via `--conditions=react-server`.)
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // describe / it / expect / vi available without imports in spec files.
    globals: true,
    // Live-DB integration tests run in their own project (vitest.config.db.ts) so this
    // default suite stays DB-free and green without DATABASE_URL.
    exclude: [...configDefaults.exclude, "**/*.db.test.ts"],
  },
});

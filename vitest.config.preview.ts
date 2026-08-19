import { defineConfig } from "vitest/config";

// Vitest config for the preview-smoke suite's pure helpers (e2e/preview/lib/*.test.ts).
//
// The default vitest.config.ts excludes all of `e2e/**` (Playwright owns that
// directory — its *.spec.ts files use test.describe(), which vitest can't run).
// These helpers have no Playwright/browser dependency at all, so they get their
// own tiny config rather than reshaping the default suite's excludes.
//
// Run with: npx vitest run --config vitest.config.preview.ts
export default defineConfig({
  test: {
    name: "preview-smoke-helpers",
    environment: "node",
    globals: true,
    include: ["e2e/preview/**/*.test.ts"],
  },
});

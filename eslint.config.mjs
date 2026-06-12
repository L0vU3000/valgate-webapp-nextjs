import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Static assets and seed data, not source. Without this, eslint lints
      // the committed minified pdf.js worker (public/pdf.worker.min.mjs, a
      // ~960k-char single line) and drowns the report in bundle noise.
      "public/**",
    ],
  },
];

export default eslintConfig;

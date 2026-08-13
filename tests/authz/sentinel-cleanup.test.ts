import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TARGET_FILES = [
  "middleware.ts",
  "tests/authz/org-scoping-idor.test.ts",
  "tests/authz/manager-access.test.ts",
  "tests/authz/parity-registry.test.ts",
  "tests/authz/manager-act-on-behalf.test.ts",
];

describe("Clerk Sentinel Cleanup Static Analysis", () => {
  it("should not contain the old sentinel literal 'sk_test_placeholder' in active code", () => {
    const failures: string[] = [];

    for (const relativePath of TARGET_FILES) {
      const absolutePath = path.resolve(process.cwd(), relativePath);
      if (!fs.existsSync(absolutePath)) {
        failures.push(`File not found: ${relativePath}`);
        continue;
      }
      const content = fs.readFileSync(absolutePath, "utf8");
      if (content.includes("sk_test_placeholder")) {
        failures.push(relativePath);
      }
    }

    expect(failures, `Found old sentinel 'sk_test_placeholder' in: ${failures.join(", ")}`).toHaveLength(0);
  });
});

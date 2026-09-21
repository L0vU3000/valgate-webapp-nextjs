// api:check-ts — regenerate the TS types from the OpenAPI spec into a temp file and
// diff against the committed copy. Non-zero exit if they disagree, so a spec change
// that lands without `npm run api:generate-ts` turns CI red instead of shipping drift.
//
// Spawns the same CLI that api:generate-ts runs, rather than importing the JS API, so
// the two paths cannot diverge on their own output (header comment, formatting, etc).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SPEC = "docs/api-spec/valgate-api-v1.yaml";
const COMMITTED = "lib/api/v1/generated-types.ts";
const BIN = join(process.cwd(), "node_modules/.bin/openapi-typescript");
const tmp = join(tmpdir(), `valgate-api-types-check-${process.pid}.ts`);

try {
  execFileSync(BIN, [SPEC, "-o", tmp], { stdio: ["ignore", "ignore", "inherit"] });

  if (!existsSync(COMMITTED)) {
    console.error(`api-contract FAIL — ${COMMITTED} does not exist.`);
    console.error("Run `npm run api:generate-ts` and commit the result.");
    process.exit(1);
  }

  if (readFileSync(COMMITTED, "utf8") !== readFileSync(tmp, "utf8")) {
    console.error(`api-contract FAIL — ${COMMITTED} is stale vs ${SPEC}.`);
    console.error("Run `npm run api:generate-ts` and commit the result.");
    process.exit(1);
  }

  console.log(`api-contract PASS — ${COMMITTED} matches ${SPEC}`);
} finally {
  rmSync(tmp, { force: true });
}

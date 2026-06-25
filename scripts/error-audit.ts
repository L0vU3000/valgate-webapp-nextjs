// B9 / C5 grep-audit: no edge may RETURN a raw error to the caller. Fails (exit 1) if any
// app/ file returns err.message / String(err) / a template embedding the error in an `error:` field.
// Reading err.message to pick a generic string (e.g. estate-assignments) is fine — not flagged.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "app");
// An `error:` (ActionResult) value that splices in the caught error → a leak.
const LEAK = /error:\s*[^,}]*(\.\bmessage\b|String\(\s*(err|error|e)\b|\$\{\s*(err|error|e)\b)/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : walk(p);
    return p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });
}

const violations: string[] = [];
for (const file of walk(ROOT)) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (LEAK.test(line)) violations.push(`${file}:${i + 1}  ${line.trim()}`);
  });
}

if (violations.length) {
  console.error(`C5 error-audit FAIL — ${violations.length} edge(s) return a raw error:`);
  violations.forEach((v) => console.error("  " + v));
  process.exit(1);
}
console.log("C5 error-audit PASS — no edge returns err.message/String(err) outbound");

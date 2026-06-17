// B9 / D13 Option A: the lib/ modules must fold into the frontend as direct calls. They may not
// import from @/app (the transport edge) or from next/* (app-runtime). Fails (exit 1) on any such
// import under lib/{db,services,auth,data}. server-only is fine (it's a build marker, not app code).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["lib/db", "lib/services", "lib/auth", "lib/data"].map((d) => join(process.cwd(), d));
const FORBIDDEN = /from\s+["'](@\/app\b|next\/|next["'])/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : walk(p);
    return p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });
}

const violations: string[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (FORBIDDEN.test(line)) violations.push(`${file}:${i + 1}  ${line.trim()}`);
    });
  }
}

if (violations.length) {
  console.error(`merge-ready FAIL — lib/ imports app-only modules (${violations.length}):`);
  violations.forEach((v) => console.error("  " + v));
  process.exit(1);
}
console.log("merge-ready PASS — lib/{db,services,auth,data} has no @/app or next/* imports (Option A)");

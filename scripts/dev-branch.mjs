#!/usr/bin/env node
// Per-branch dev server port.
//
// `npm run dev` hardcodes 3001, so a second worktree of this repo collides with the first (and
// with seafan/haddock/main all trying to be 3001). This derives a stable port from the worktree's
// directory name, so each checkout gets its own without anyone picking numbers by hand.
//
// Stable, not random: the same branch keeps the same port across restarts, so a Clerk redirect
// URL or a bookmark stays valid. If the derived port is taken it moves up until it finds a free
// one (and says which), rather than refusing to start.
//
//   npm run dev:branch              # starts next dev on this worktree's port
//   npm run dev:branch -- --turbopack
//   node scripts/dev-branch.mjs --print-port   # just say which port it would use
//
// Deliberately leaves the fixed-port scripts (`dev`, `dev:e2e`) alone: playwright.config.ts and
// scripts/check-dev-e2e-script.mjs both assert 3001/3002, and those are the E2E lane's ports.
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { basename } from "node:path";

const BASE = 3001;
const SPAN = 99; // 3001–3099

/** Stable port in [BASE, BASE+SPAN) for a checkout name. Exported so a test can pin it. */
export function portFor(name) {
  const h = createHash("sha1").update(name).digest();
  return BASE + (h.readUInt16BE(0) % SPAN);
}

function isFree(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

/** portFor(name), advanced past anything already listening. */
export async function pickPort(name) {
  const start = portFor(name);
  for (let i = 0; i < SPAN; i++) {
    const port = BASE + ((start - BASE + i) % SPAN);
    if (await isFree(port)) return port;
  }
  throw new Error(`No free port in ${BASE}-${BASE + SPAN - 1} for "${name}"`);
}

async function main() {
  const name = basename(process.cwd());
  const port = await pickPort(name);
  const derived = portFor(name);

  if (process.argv.includes("--print-port")) {
    console.log(String(port));
    return;
  }

  if (port !== derived) {
    console.log(`Port ${derived} is busy — using ${port}.`);
  }
  console.log(`[${name}] http://localhost:${port}`);

  const args = process.argv.slice(2).filter((a) => a !== "--print-port");
  const child = spawn("next", ["dev", "-H", "0.0.0.0", "-p", String(port), ...args], {
    stdio: "inherit",
    // `next` is resolved from node_modules/.bin by npm, but this script may be run directly.
    shell: false,
    env: { ...process.env, PATH: `${process.cwd()}/node_modules/.bin:${process.env.PATH}` },
  });
  for (const sig of ["SIGINT", "SIGTERM"]) child.on(sig, () => child.kill(sig));
  child.on("exit", (code) => process.exit(code ?? 0));
}

// Only run when invoked directly, so importing portFor in a test does not start a server.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

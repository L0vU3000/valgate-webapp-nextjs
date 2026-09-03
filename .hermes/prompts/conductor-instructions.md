# Conductor Instructions: Working on Valgate Webapp

## Current Workspace
- **Repo:** `https://github.com/L0vU3000/valgate-webapp-nextjs`
- **Active path:** `/Users/mintrose/Dev/Projects/work/Valgate/active/valgate-webapp-nextjs`
- **Branch:** `main`

## Start Here
1. Read `.hermes/doc/CONTEXT.md`
2. Read `AGENTS.md` and `HERMES_BRIEFING.md`
3. Read `.cursorrules` and `.impeccable.md`

## Engineering Rules
1. Default to Server Components; add `"use client"` only at leaves.
2. Server Actions call `lib/services/*`; never touch Drizzle directly from actions.
3. Validate all input with Zod; never return raw `err.message` to clients.
4. Do not expose secrets; never prefix secrets with `NEXT_PUBLIC_`.
5. Run `.hermes/bin/hermes-preflight.sh` before any build/push.

## Build
- `npm install` (if needed)
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Protected
- Do not modify production Vercel config or CI without approval.
- No `seed:reset`, `seed:neon`, or database mutations on VPS.
- No production deploys without explicit owner approval.

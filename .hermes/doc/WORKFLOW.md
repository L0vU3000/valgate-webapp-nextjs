# Workflow

1. Read `AGENTS.md` and `HERMES_BRIEFING.md` first.
2. Server Components by default; client only at leaves.
3. Server Actions delegate to `lib/services/*` for DB work.
4. Verify with `npm run lint`, `npm run typecheck`, tests, and build before committing.

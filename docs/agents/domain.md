# Domain docs — valgate-webapp-nextjs

Layout: **single-context**.

- `CONTEXT.md` — repository root (ubiquitous language for this repo; created when the
  owner writes it — absence is fine, agents fall back to AGENTS.md + vault).
- Decisions (ADR-equivalent): `vault/decisions/` is the canonical decision log for this
  repo (`ruthless-mvp-cut`, `neon-not-convex`, `drizzle-only-hand-authored-migrations`, …).
  New decisions land there, not under `docs/adr/`.
- Product definition pointer: `PRD.md` in valgate-knowledge points here/nextjs repo.
- Consumer rules: agents read CONTEXT.md (if present) at session start; contradictions
  between CONTEXT.md and AGENTS.md resolve in AGENTS.md's favor (repo code rules win
  language rules).

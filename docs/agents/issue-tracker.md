# Issue tracker — valgate-webapp-nextjs

Tracker: **Linear** (freeform, described by the owner's workflow — not GitHub/GitLab/local).

- Project: **Valgate Webapp** (org workspace used for all Valgate work).
- Ticket IDs: VAL-NNN (shared prefix with Valgate IOS tickets; project field distinguishes).
- Reading tickets: the coordinator chat (Hermes/Paseo) owns Linear access and surfaces
  tickets to makers in briefs. Makers do not call Linear APIs directly.
- Writing tickets: coordinator creates/updates tickets on round close (status flow
  Todo → In Progress → In Review → Done; "Needs Design Review" when a design decision
  gates the work).
- PRs as a request surface: **off** — PRs are review artifacts in GitHub, not triage
  queue items.

`triage`, `to-tickets`, and `to-spec` write through the coordinator into Linear; they
never push to GitHub issues on this repo.

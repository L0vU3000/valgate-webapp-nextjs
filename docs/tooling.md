# Agent Tooling — MCP Servers & CLIs

Snapshot of what this agent can reach for Valgate work, and what's available but not wired up yet. Not app architecture — see `docs/nextjs-architecture.md` for that.

---

## MCP Servers — Connected

| Server | Endpoint | Scope | Use for |
|---|---|---|---|
| **Neon** | mcp.neon.tech | user | Run SQL, inspect schema/branches, migrations against the Neon Postgres backend |
| **context7** | mcp.context7.com | user | Up-to-date library docs (Next.js, Drizzle, Clerk, etc.) |
| **plugin:figma:figma** | mcp.figma.com | user | Read/write Figma designs, Code Connect |
| **pencil** | local binary | user | `.pen` design file editing |
| **mobbin** | api.mobbin.com | user | Mobile/web UI pattern reference search |
| **agent-native-assets** | assets.agent-native.com | user | Image/video asset generation, app picker |
| **plan** | plan.agent-native.com | user | Visual plans/recaps, prototypes |
| **agentation** | npx agentation-mcp | user+local (⚠️ conflict) | Annotation/feedback threads — duplicated in user+local scope with different endpoints, see `claude mcp list` warning |
| **openrouter** | mcp.openrouter.ai | user | Cross-model routing, benchmarks, pricing |
| **clerk** | mcp.clerk.com | user | Up-to-date Clerk SDK snippets/patterns |
| **github** | api.githubcopilot.com/mcp | user | Issue/PR management, CI insight (authed via `gh auth token`) |
| **playwright** | npx @playwright/mcp@latest | user | Structured browser automation for the `e2e/` suite |
| **shadcn** | npx shadcn@latest mcp | local (this project) | Browse/search/install shadcn components by name |
| **vercel** | mcp.vercel.com | user | ⚠️ added, needs OAuth — run `/mcp` interactively to finish authorizing |
| **sentry** | mcp.sentry.dev | user | ⚠️ added, needs OAuth — run `/mcp` interactively to finish authorizing |

**Needs authorization**: `claude.ai Gmail`, `claude.ai Google Calendar`, `claude.ai Google Drive` (via claude.ai connector settings), plus **vercel** and **sentry** above (via `/mcp` in an interactive session).

**Skipped on request**: Stripe MCP (until payments is chosen), Resend MCP (needs a `RESEND_API_KEY` — none found in `.env*`; add later with `claude mcp add -s user resend -e RESEND_API_KEY=re_xxx -- npx -y resend-mcp`).

---

## CLIs — Installed

`gh` 2.95.0 · `npm` 10.9.2 · `npx` · `node` 22.17.0 · `bun` 1.3.11 · `docker` 28.3.2 · `git` 2.53.0 · `claude` 2.1.161 · `codex` 0.136.0 · `clerk` 1.5.0 · `vercel` (new) · `neonctl` (new) · `aws` 2.35.14 (new, via Homebrew)

Available via `npx` (in `package.json`, not global): `drizzle-kit`, `tsx`, `typescript`.

## CLIs — Not installed, skipped on request

| CLI | Official? | Why it'd help here |
|---|---|---|
| `stripe` | Yes, Stripe | Webhook forwarding/testing, once payments is decided — skip until then |
| `pnpm` / `yarn` | N/A | Not needed — repo uses `npm` |

---

*Generated 2026-07-02 by inventorying `claude mcp list`, `command -v`, and web search for stack-relevant official servers/CLIs. Updated same day: installed vercel/neonctl/awscli CLIs and vercel/clerk/sentry/github/playwright/shadcn MCP servers; skipped stripe (on request) and resend (missing API key).*

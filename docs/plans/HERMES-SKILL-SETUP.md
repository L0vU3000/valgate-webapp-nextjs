# Hermes — skill setup

> **Written:** 2026-08-11 · Replaces the earlier ~110-skill setup doc.
>
> Hermes has one job: execute `docs/plans/PUBLIC-LAUNCH-PLAN.md`, then
> `docs/plans/IOS-APP-PLAN.md`. This installs the skills for *that job* and nothing else.

**Why so few.** Every installed skill's name and description loads into the agent's context
before work begins. At ~110 skills that is thousands of tokens of menu, and it measurably raises
the misfire rate — an agent fixing a redirect chain should not have `bolder`, `colorize` and
`overdrive` in reach. This installs **14 now, 9 later**.

---

## Part 1 — Plugins (3 now)

Only three plugins are needed for the launch work.

```
obsidian    /plugin marketplace add kepano/obsidian-skills
            /plugin install obsidian@obsidian-skills

ponytail    /plugin marketplace add DietrichGebert/ponytail
            /plugin install ponytail@ponytail

karpathy    /plugin marketplace add multica-ai/andrej-karpathy-skills
            /plugin install <slug>@andrej-karpathy-skills
            ^ repo confirmed; plugin slug NOT confirmed. Run /plugin after
              adding the marketplace and read the actual slug before installing.
```

If `/plugin` is unsupported, the generic installer clones the repo and links the skill folders.
⚠️ **Unverified** — confirm `npx skills` exists before relying on it:

```bash
npx skills add https://github.com/kepano/obsidian-skills
npx skills add https://github.com/DietrichGebert/ponytail
npx skills add https://github.com/multica-ai/andrej-karpathy-skills
```

**ponytail ships lifecycle hooks.** Review and trust them explicitly or the plugin loads inert.
Its anti-over-building stance is deliberate here — it is a good fit for a fast-moving build agent.

Two more plugins are needed later, not now — see Parts 4 and 5.

---

## Part 2 — Local skills (11)

These are private. **Do not search for them on GitHub** — you will install someone else's
unrelated repo. Copy them from disk.

```bash
DEST="$HOME/.agents/skills"     # or your agent's skills dir
mkdir -p "$DEST"

# 9 from ~/.claude/skills/
for s in graphify read-the-damn-docs context7-mcp investigate \
         qa-only review cso quick-recap ship; do
  cp -R "$HOME/.claude/skills/$s" "$DEST/$s"
done

# 2 from ~/.agent-skills/skills/  (mirrored nowhere else)
for s in security-and-hardening incremental-implementation; do
  cp -R "$HOME/.agent-skills/skills/$s" "$DEST/$s"
done
```

Different machine? Tarball first:

```bash
tar czf hermes-skills.tgz \
  -C "$HOME/.claude/skills" graphify read-the-damn-docs context7-mcp \
     investigate qa-only review cso quick-recap ship \
  -C "$HOME/.agent-skills/skills" security-and-hardening incremental-implementation
```

---

## Part 3 — What each skill is for

Nothing here is generic. Each maps to a task in the launch plan.

| Skill | Source | Why |
|---|---|---|
| `graphify` | local | `CLAUDE.md` **mandates** querying it before grepping. Build the graph first: `graphify update .` |
| `obsidian-markdown` | plugin | `vault/` is in-repo — 40 files, wikilinks, 14 decision records |
| `read-the-damn-docs` | local | Clerk/Next/Drizzle API drift. The installed Clerk uses the Future/signals API; the classic one does not exist here. Assuming from memory is how that bites |
| `context7-mcp` | local | Same problem, fetches live docs |
| `investigate` | local | Root-cause debugging over symptom-patching |
| `qa-only` | local | **Report-only.** Deliberately not `qa`, which fixes what it finds — findings should come back for a decision, not arrive as commits |
| `review` | local | Review its own commits before they land |
| `cso` | local | Security pass before a public launch |
| `ponytail-review` | plugin | Catches over-engineering in its own output |
| `quick-recap` | local | The red/yellow/green status-block convention |
| `karpathy-guidelines` | plugin | Reduces overcomplication and unsurfaced assumptions |
| `security-and-hardening` | local | Phase 4: RLS, and the unconfirmed document-deletion authz gap |
| `incremental-implementation` | local | Small reviewable commits |
| `ship` | local | PR hygiene. **Does not deploy** — deployment is blocked on an unresolved decision |

---

## Part 4 — Add when Phase 2.1 starts (landing page)

Not before. These are design skills and the landing page is the only design task in scope.

```
interfaces    /plugin marketplace add jakubkrehel/skills
              /plugin install interfaces@interfaces

impeccable    /plugin marketplace add pbakaus/impeccable
              /plugin install impeccable@impeccable
```

Then use exactly four: **`shape`** (plan the UX before writing code), **`impeccable`**,
**`better-ui`**, and **`frontend-design`** (`cp -R "$HOME/.claude/skills/frontend-design" "$DEST/"`).

⚠️ **Ignore the rest of what those two plugins install.** Between them they add ~25 skills
covering the same ground repeatedly. Four is the working set.

⚠️ **Do not install `ui-ux-pro-max`.** All 7 of its skills duplicate impeccable + interfaces.

---

## Part 5 — Add when the iOS phase starts

```bash
for s in ios-qa ios-fix ios-design-review ios-sync ios-clean; do
  cp -R "$HOME/.claude/skills/$s" "$DEST/$s"
done
```

Plus `figma-swiftui` from the official Figma plugin (`/plugin install figma@claude-plugins-official`)
— **only** if a Figma file is actually in play. Install none of the other 11 Figma skills.

---

## Part 6 — Repo-local (not skills)

This repo has **no `skills/` directory**. It has:

- **5 opsx slash commands** — `.claude/commands/opsx/`: `propose`, `apply`, `sync`, `archive`,
  `explore`. Used for OpenSpec change proposals (see `openspec/changes/`).
- **One hook** — `.claude/hooks/plan-mirror-reminder.sh`, which enforces mirroring plans into
  `docs/plans/`. If your harness does not run it, **honour the rule manually**: every plan gets
  written to `docs/plans/`.

---

## Part 7 — Verify before starting work

```bash
# graphify is the one with a hard prerequisite
graphify update .                    # ~12k nodes expected on this repo
graphify query "how does a server action reach the database"
# Must return lib/ and app/ nodes. If it returns only docs/ headings,
# the graph is clobbered — re-run `graphify update .`.
```

Then confirm the skill list your harness reports contains the 14 from Parts 1–2, and does **not**
contain `bolder`, `colorize`, `overdrive`, `delight`, or the `paseo-*` family. If it does, the
wrong set was installed.

---

## Deliberately excluded

Recorded so nobody re-adds them by reflex.

| Excluded | Count | Reason |
|---|---|---|
| `ui-ux-pro-max` (whole plugin) | 7 | Fully redundant with impeccable + interfaces |
| Most of `impeccable` | 16 | Design-polish verbs; the human is the designer |
| Most of `interfaces` | 6 | Same ground as `better-ui` |
| Most of `figma` | 11 | No Figma file in play |
| `paseo-*` | 5 | Agent orchestration — Hermes *is* the agent. Nested spawning risks recursion and cost |
| gstack infrastructure | ~20 | `benchmark`, `benchmark-models`, `canary`, `pair-agent`, `skillify`, `scrape`, `connect-chrome`, `open-gstack-browser`, `setup-browser-cookies`, `gstack-upgrade`, `setup-gbrain`, `sync-gbrain`, `health`, `retro`, `landing-report`, `office-hours`, `codex`, `make-pdf`, `diagram`, `design-shotgun`, `design-consultation`, `design-html` — none map to a launch-plan task |
| `visual-plan`, `visual-recap` | 2 | Planning artifacts authored upstream; Hermes executes |
| `qa` | 1 | Auto-fixes what it finds. `qa-only` reports instead |

### The trap this replaces

The previous setup doc installed the impeccable plugin **and** copied `~/.agents/skills/`
wholesale. Those two sources share **15 skill names** — `adapt animate audit bolder clarify
colorize critique delight distill harden optimize overdrive polish quieter typeset` — and the
copies **differ in content** (verified by diffing `polish/SKILL.md`). That gives 15 same-named
skills with divergent instructions and no defined resolution order.

Copying named skills instead of whole directories, as Part 2 does, avoids this entirely.

Also corrected: `~/.claude/skills/` is **not** a superset. 22 skills exist in `~/.agents/skills/`
that are not in it.

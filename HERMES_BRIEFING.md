# Project Briefing for Hermes

**Purpose:** context, not a checklist. It explains the environment, what we've learned about its constraints, and *why*. Use it to make your own calls. Hard rules say so explicitly; everything else is reasoning to apply judgement to — and to push back on if you find evidence it's wrong.

*Revision 4. New: visual verification (§3) — the frontend equivalent of the Swift build gap; snapshot testing in AppCore (§2.5); layered secret scanning (§10). Previously added: the Mac checkout protocol (§2.2), VPS security posture (§9), WIP limits (§7), daily heartbeat (§13).*

---

## 1. The setup

- Solo developer. A **Next.js web app** and a **Swift iOS app**, one monorepo.
- You run on a **Linux VPS**, on a **Tailscale** tailnet.
- A **Mac** is on the same tailnet, normally awake, reachable over SSH as user `hermes`. It is the only machine that can build iOS.
- The developer is frequently away from their laptop and reviews on a phone.

Operating assumption: you work autonomously for hours, they review in short bursts on a small screen. A correct 40-file PR that can't be reviewed on a phone is worse than three small ones.

---

## 2. iOS: what's Mac-only, and how to reach the Mac

### 2.1 The actual constraint

Be precise — an earlier analysis conflated a hard constraint with a fixable bug and distorted the priorities.

**Genuinely Mac-only, permanently:** iOS app builds, XCTest, the Simulator. Xcode does not exist on Linux.

**Not Mac-only:** E2E tests, visual UI review, phone preview. Those were blocked by auth and data — ordinary Linux problems. See §5.

Do **not** attempt to run macOS on the VPS. Violates Apple's EULA, unreliable. Hard rule.

### 2.2 The checkout protocol — read before your first iOS build

The Mac has its own clone at `/Users/hermes/work/<repo>`. **It does not see your working tree.** Running `xcodebuild` there without syncing builds whatever that clone last had checked out — you'd get feedback about code that isn't yours, a failure that looks like a toolchain problem but isn't.

**Push first, then build.** The SSH path only works on committed, pushed commits.

```bash
git push -u origin "$BRANCH"
ssh hermes@<mac>.<tailnet>.ts.net "
  cd /Users/hermes/work/<repo> &&
  git fetch origin '$BRANCH' &&
  git checkout -f FETCH_HEAD &&
  set -o pipefail &&
  cd ios && xcodebuild test ... | xcsift
"
```

`checkout -f` onto a detached HEAD is intentional — that clone is a build target, not a workspace. Never leave local modifications there.

Consequence: **iOS iteration has commit granularity.** You can't test an uncommitted edit. Commit small and often on the branch; squash before the PR if history gets noisy.

### 2.3 Two routes

1. **SSH (primary).** The Mac is normally awake, so this is fast enough to iterate against. Probe first — `ssh -o ConnectTimeout=5 -o BatchMode=yes <host> true` — and fall back rather than blocking.
2. **GitHub Actions self-hosted runner (fallback + durable PR check).** Survives the laptop being shut or rebooted. Push to CI for the PR check even when you've already built over SSH.

A queued job that hasn't started is **pending**, not blocked. If the Mac rebooted, its runner needs a human login before the queue drains — a stalled queue may need a nudge rather than debugging.

### 2.4 xcsift and the pipefail trap

`xcodebuild` output goes through `xcsift`, producing `{"file", "line", "message"}` JSON. Parsing raw xcodebuild logs by hand means something is misconfigured — say so rather than working around it.

**Any `xcodebuild | xcsift` pipeline needs `set -o pipefail`.** Without it the exit status comes from xcsift, which *succeeds* at parsing a failed build — broken code reports green. If iOS jobs never fail, suspect this first.

### 2.5 AppCore — the structural fix

Swift runs on Linux; Xcode and the Apple frameworks don't. Anything not importing UIKit/SwiftUI belongs in a package **you** can build and test:

```
ios/
  Packages/AppCore/     ← models, networking, persistence, view models, business rules
                          `swift build && swift test` on the VPS — no Mac, no push, no commit
  MyApp.xcodeproj/      ← thin SwiftUI shell
```

Roughly 60–70% of Swift lines in AppCore — heuristic, not quota. **When you have a choice about where logic goes, prefer the side you can test.**

**`swift-snapshot-testing` extends what you can verify here.** It runs on Linux, and `assertSnapshot(of: value, as: .dump)` or `.json` captures any value's structure as committed text — so you can verify model shapes, decoded API payloads, and view-model output locally, no Mac involved. Image snapshots of actual SwiftUI views need a simulator; those belong in the Mac-side test target, where they give you iOS visual regression.

Treat `.dump`/`.json` snapshots as ordinary AppCore tests and reach for them freely. They're the cheapest verification available on the iOS side.

---

## 3. Visual verification — you can't see what you build

The Swift build gap has a frontend twin: **you write CSS and layout you never see rendered.** Behavioural tests pass while a page looks broken — a stray margin, a font swap, a z-index collision. Assume you are blind to appearance unless something renders and checks it.

### 3.1 The regression gate: `toHaveScreenshot()`

Playwright has this built in — no extra service. First run records a baseline PNG committed to the repo; later runs diff pixel-by-pixel. Tune `maxDiffPixels` / `maxDiffPixelRatio` to keep false positives down; mask timestamps and other dynamic regions rather than loosening the threshold globally.

Add a screenshot assertion to any PR that changes visual output. This is the frontend counterpart of `check.sh` going green — treat it as part of "done," not as extra credit.

### 3.2 Playwright MCP: for looking, not for judging

Playwright MCP gives you a real browser to navigate and observe. Use it to explore a page, diagnose a failing test, and author new tests grounded in what actually rendered.

**Do not use it as the regression mechanism.** You can spot gross anomalies in a screenshot — overflowing text, a missing image — but not a 2px offset or a hue shift, not reliably. Deterministic pixel comparison does that; a model reading an image does not. The durable contract is committed Playwright tests.

Prefer the accessibility tree over screenshots where the tree works — tree-based interaction is more reliable than vision-based clicking regardless of image quality.

### 3.3 Reporting visual work

When you've changed something visible, say so and make sure the `tailscale serve` preview is live. A working preview the developer can open on their phone beats any description. If a screenshot baseline changed intentionally, call that out explicitly in the PR — an updated baseline is a claim that the new appearance is correct, and only the developer can confirm that.

---

## 4. Reporting confidence

Four states, never collapsed into "done":

- **Tested** — ran, passed, including visual assertions where relevant.
- **Built, not exercised** — compiled, no test covers it.
- **Written, unverified** — no build has touched it.
- **Rendered, unreviewed** — visually changed; baseline updated but a human hasn't confirmed it looks right.

On this project these distinctions carry real information. Losing them destroys the thing the developer most needs to know.

---

## 5. The test environment

`DEMO_MODE` is intentionally neutered — hence the 500s on `/portfolio`, `/add-property`, `/property/[id]`. Correct diagnosis, but expanding it with seeded fakes was **rejected**: a second code path means the UI reviewed on a phone isn't the UI users get, and every feature gets built twice.

- **Postgres in Docker on the VPS**, seed script for `ORG-0001`.
- **`@clerk/testing/playwright`** — `clerkSetup()` in global setup obtains a Testing Token for the suite (bypasses the bot detection that otherwise yields "Bot traffic detected"); `clerk.signIn()` + `storageState` so tests start authenticated. Reference: `github.com/clerk/clerk-playwright-nextjs`.
- **`next build && next start`**, never `next dev`. Dev compiles routes on demand — exactly what makes Playwright slow and flaky. The production build is faster at runtime and matches what ships. It's also what screenshot baselines must be captured against, or they'll drift.
- **`tailscale serve`** the production build. HTTPS, stable hostname, no open ports.

Keep `DEMO_MODE` only for genuinely static marketing pages, if at all.

**iOS has no preview equivalent yet.** Until TestFlight upload exists, the developer cannot see iOS work while away. Treat closing that gap as high-value once builds are green; flag it if it keeps slipping.

---

## 6. Repository shape

```
/web        Next.js
/ios        Xcode project + Packages/AppCore
/shared     OpenAPI spec → generated TS + Swift clients
/scripts    check.sh
```

`swift-openapi-generator` (SwiftPM plugin, generates at build time so it can't drift) on the Swift side; `@hey-api/openapi-ts` on the TS side. **Generate, don't hand-write** — drift between two codebases developed asynchronously is the bug class hardest to catch without a human watching.

If Tuist is adopted, `.xcodeproj` becomes generated and gitignored. `.xcodeproj` diffs are unreadable, which is fatal for phone review.

Screenshot and snapshot baselines are committed artifacts. Keep them organised and don't let stale ones accumulate.

---

## 7. Git rules and flow control

**Hard** — the safety net for unsupervised work:

- **Never push to `main`.** Branch → PR → CI green → the developer merges. If branch protection isn't enforcing this, say so.
- **Never open a PR on a failing `./scripts/check.sh`.** Blocked? Draft PR, explain what's stuck.
- **Never force-push a branch with an open PR.** The developer may be mid-review on a phone.

**WIP limit: 2–3 open PRs.** A real constraint, not politeness. You generate PRs faster than one person merges them on a phone; unmerged work diverges, conflicts multiply, and you start building on assumptions nobody ratified. At the cap, switch to work needing no PR — tests, investigating §14, improving coverage — and say you're doing so.

**Strong defaults:**

- One task per branch, small PRs. Ballooning past a few files? Propose a split.
- Conventional commits (`feat:`, `fix:`, `test:`, `refactor:`) — so a human can scan 30 commits on a phone.
- Parallel subagents each get their own `git worktree` on one `.git`.
- Rebase on `main` before opening a PR so CI reflects the merge result.

---

## 8. Testing

```bash
./scripts/check.sh          # fast gates + secret scan
./scripts/check.sh --full   # + e2e + visual regression
./scripts/check.sh --ios    # + push, then iOS on the Mac if reachable
```

Fast gates (typecheck, lint, unit, AppCore, gitleaks) every iteration. Slow gates (Playwright, screenshots, Mac builds) on push. Don't wait ten minutes for feedback on a typo; don't skip slow gates because they're slow.

Thin coverage is work to propose, not a limitation to accept — especially in AppCore, where coverage buys back the confidence lost to the build gap. The iOS view layer will have low unit coverage; that's expected, and why it stays thin and why snapshot tests carry weight there.

---

## 9. VPS security posture

This machine holds the Clerk secret key, database credentials, the Ollama key, and SSH access to the Mac. The Mac is hardened; if this box falls, that hardening is irrelevant. Treat it as the sensitive one.

- **Bind services to Tailscale only.** Gateway, Next.js preview, Postgres — tailnet interface or localhost, never `0.0.0.0`.
- **Firewall by default:** deny incoming except on `tailscale0`, plus the developer's own access.
- **Never open a public port** without explicit approval, even temporarily for debugging. If something seems to need it, propose and wait.
- **The Mac SSH key is single-purpose** — one user, one machine, port 22 only by tailnet ACL. Don't reuse it.
- **Repo access is a deploy key scoped to this repo**, not a personal token. Needing broader GitHub access is a conversation, not a workaround.

If any of the above isn't true, report it rather than fixing it silently — the developer needs to know the state was wrong.

---

## 10. Secret hygiene

Everything in your environment is readable by you, so it can end up somewhere it shouldn't without anyone intending it.

- **Never echo environment variables** into logs, PR bodies, commit messages, or gateway messages. Not while debugging either.
- **Never paste config files** containing credentials into a PR description or chat. Describe the shape, not the contents.
- **Layered scanning:** `gitleaks` pre-commit and in `check.sh` for sub-second local feedback; **GitHub push protection** at the platform layer, which blocks known secrets before they land and covers base64-encoded ones. Push protection is deliberately outside your control — do not attempt to bypass or disable it.
- If gitleaks fires, **stop**. Don't rewrite the rule to pass; a false positive is worth a conversation.
- If you believe a secret was exposed, **say so immediately and stop touching it.** Rotation is the developer's call. Quietly continuing is the failure mode that matters.

---

## 11. Model and quota

Ollama Cloud. `kimi-k2.6-cloud` and `qwen3-coder:480b-cloud` are inside subscription quota; `kimi-k3:cloud` bills separately, pay-as-you-go. Quota is GPU time with session and weekly caps.

A fast SSH loop means more iteration, so: **three attempts at the same fix without progress, stop and report.** "Here's what I tried, here's where I'm stuck" is worth more than a fourth attempt and costs less.

---

## 12. Judgement boundaries

**Decide yourself:** implementation approach, file organisation, naming, in-scope refactors; which tests to write and at what level; AppCore vs app target placement; SSH vs queue for a given build; when to split a PR; what to work on at the WIP cap; when to reach for Playwright MCP to diagnose something.

**Propose and wait:** new dependencies (especially iOS); schema or API contract changes; anything touching auth, payments, or user data; repo structure changes; anything costing money; anything opening a network port or widening credential scope.

**Stop and report:** `check.sh` failing in a way you can't diagnose; gitleaks or push protection firing; anything needing a force-push or history rewrite; a suspected secret exposure; discovering a hard rule can't be satisfied.

---

## 13. Reporting

Read on a phone, between other things. Lead with state, not narrative.

> **Done:** AppCore token refresh + 6 tests. check.sh green. PR #42.
> **Rendered, unreviewed:** Portfolio card spacing — screenshot baseline updated, preview live at the usual URL.
> **Built, not exercised:** LoginView wiring — compiles on Mac, no test coverage.
> **Blocked:** Playwright login times out in CI, passes locally. Suspect env var. Not fixed.

### Daily heartbeat

Once a day through the gateway, unprompted — one line, even when nothing is wrong. Silence currently looks identical to a dead runner, a full disk, or a crashed agent, and the developer shouldn't have to check.

> Mac runner idle · 2 PRs open (#42, #43) · VPS disk 62% · quota ~40% week · last iOS build green 3h ago

### Backups

Run `hermes backup` weekly. The VPS holds your accumulated memory, skills, and config — the one part of this system not reproducible from git.

---

## 14. Open questions

Form a view while working and say so:

1. Tuist vs XcodeGen at this project's size?
2. Where does the AppCore boundary actually fall in practice? The 60–70% figure is a heuristic.
3. **Log every occasion you wait on the Mac.** Two weeks of that tells us whether the laptop suffices or a dedicated Mac mini is warranted.
4. Is the Playwright suite catching real regressions, or just costing maintenance?
5. Is commit-granularity on iOS iteration (§2.2) actually painful, or does AppCore absorb enough that it rarely bites?
6. Are screenshot baselines earning their keep, or generating churn? If most diffs are intentional, the thresholds or masks need work.

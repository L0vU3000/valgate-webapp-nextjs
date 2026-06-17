# Phase 7 — Polish & Harden (Valgate Agent)

## Context

Phases 0–6 of the Valgate Agent are implemented and green (`tsc` 0 / `eslint` 0 errors / vitest 45). Phase 7 is the final "polish & harden" pass before v1, driven by spec **§4.4 (the six UI states)** and the `/impeccable` craft loop (§10).

Exploration showed that **the "animate" half is essentially already shipped**: spring-in approval card, amber pulse, staggered suggestion chips, typing-reveal, thinking dots, panel entrances, and `prefers-reduced-motion` guards all exist (`AIMessageBubble.tsx`, `AIChatPane.tsx`, `ApprovalGate.tsx`, `theme.css` keyframes). The real gaps are in **harden** — the degraded and error states.

The most consequential gap: the spec's **"running in basic mode" banner** (§4.4 error/degraded) does not exist, and `generateAssistantReply` returns **no signal** about which engine ran. Today `ANTHROPIC_API_KEY` is empty, so the agent silently runs the no-tools path — the user has no idea actions/tools are unavailable. This plan makes the degraded state honest and visible.

**Decisions locked:** Harden-first scope (D1=A). Keep `generateText` — no `streamText` swap (D2=A). Verify only the no-key paths now; full-mode verification is a documented follow-up (D3=A).

## Scope

Build the missing §4.4 states + a light animate touch on tool rows. Do **not** re-polish already-shipped animations and do **not** touch the streaming engine.

---

## Work items

### 1. Degraded "basic mode" signal + banner  ← primary
**Why:** the agent runs text-only (no tools/actions) whenever there's no Anthropic key, with zero indication.

- **`lib/actions/ai-overlay.actions.ts`** — in `getOverlayBootstrap` (around l.334 return), compute and return a server-side flag:
  `agentMode: process.env.ANTHROPIC_API_KEY ? "full" : "basic"`.
  Add it to the `AiOverlayBootstrap` data shape (find the type — referenced near the action's return / `lib/data/types`). Env is read server-side only; the flag is the only thing crossing to the client (no key leakage).
- **`components/layout/AIOverlay.tsx`** — thread `agentMode` from bootstrap into state, pass to `AIChatPane`.
- **`components/layout/ai-overlay/AIChatPane.tsx`** — render a slim amber/neutral banner above the message stream (sibling to the `loadError` block, ~l.260) when `agentMode === "basic"`:
  copy ≈ *"Running in basic mode — live data tools and actions are unavailable."* `role="status"`, not dismissible, no animation needed beyond the existing panel entrance.

### 2. Failed-tool row (red + shake-once)
**Why:** §4.4 streaming/error — a tool that errors should read as failed, not silently vanish.

- **`lib/data/types/ai-message.ts`** — add `ok: z.boolean().optional()` to `AiMessageStepSchema` (l.8). Absent/`true` = success (back-compat with existing seed messages).
- **`lib/actions/ai-overlay.actions.ts`** — when building `steps` (l.211), cross-reference `step.toolResults`: if a tool call has no matching successful result (or the SDK surfaces a tool error), set `ok: false` on that step. Best-effort — read tools rarely fail.
- **`components/layout/ai-overlay/AIMessageBubble.tsx`** (l.145–158) and **`AIWorkspaceAssets.tsx`** (l.124–137) — when `step.ok === false`, switch the row to red tokens (`border-red-200 bg-red-50/…`, red dot/text) and apply a one-shot `animate-[ai-shake_…] motion-reduce:animate-none`.
- **`styles/theme.css`** — add an `ai-shake` keyframe (small ±2–3px X translate, ~0.4s, runs once) near the existing `ai-dot`/`glass-card-in` block.

### 3. Activity-pane skeleton on load
**Why:** §4.4 loading — the right pane has an "Agent Activity" section but no loading state (chat pane already has skeletons at `AIChatPane.tsx` l.279).

- **`components/layout/AIOverlay.tsx`** — pass existing `isLoading` to `AIWorkspaceAssets`.
- **`components/layout/ai-overlay/AIWorkspaceAssets.tsx`** (Activity block, l.116–141) — when `isLoading`, render 2–3 `animate-pulse … motion-reduce:animate-none` skeleton rows instead of "No activity yet." Reuse the same shimmer style as the chat skeletons.

### 4. Tool-row enter stagger (the one genuine "animate" add)
**Why:** §4.4 streaming wants per-row `EnterLi` stagger; rows currently pop in flat.

- **`components/layout/ai-overlay/AIMessageBubble.tsx`** (steps map, l.147) — wrap rows in `motion.div` with `initial={{opacity:0,y:6}}` / `animate` / `transition delay: i*0.05`, gated on the existing `useReducedMotion()` pattern already used in `AIChatPane.tsx`. Same treatment optional for the Activity-pane rows.

### 5. Overflow / long-text hardening (edge cases)
**Why:** §4.4 harden — long payload values and assistant text must not blow out the layout.

- **`components/layout/ai-overlay/ApprovalGate.tsx`** (payload list ~l.135–169) — add `min-w-0 break-words` to value cells so long IDs/strings wrap.
- **`AIMessageBubble.tsx`** (markdown wrapper l.162) — ensure `min-w-0 break-words` on the text container so long tokens/URLs wrap inside the bubble.

---

## Out of scope (documented follow-ups)
- `streamText` swap for live tool-row appending (deferred, D2).
- Full-mode runtime verification: tool-call → grounded answer + Activity trace, and approval Approve/Reject/Undo — **requires `ANTHROPIC_API_KEY`** (deferred, D3).
- `/impeccable critique` scored gate (D1=A chose harden-first over the full sweep).
- Open loose ends from handoff: revert `gpt-4o-mini`→`gpt-5-mini`?; progress-pillar 7-vs-8 reconciliation. Not part of Phase 7.

## Reuse notes
- Motion lib already present: `motion` v12 (`motion/react`), `useReducedMotion()` — copy the pattern from `AIChatPane.tsx` suggestions (l.320–330).
- Skeleton style already exists: `AIChatPane.tsx` l.281–282 (`animate-pulse … motion-reduce:animate-none`).
- Error/red token pattern already exists: `AIChatPane.tsx` loadError block l.262–268; `ApprovalGate.tsx` error banner l.114.
- Keyframes live in `styles/theme.css` (`glass-card-in`, `ai-dot`) — add `ai-shake` alongside.

## Verification (no key needed)
1. `SITE_PASSWORD= npm run dev` (port 3001). Open Pro cockpit → "Ask Valgate Agent" (desktop width ≥ sm) → **New Session**.
2. **Basic-mode banner:** with `ANTHROPIC_API_KEY` empty, banner shows above the stream; copy is honest, dismiss-free, `role="status"`.
3. **Loading:** on first open, chat skeletons + Activity-pane skeleton rows render, then resolve.
4. **Empty / streaming:** new session shows welcome + staggered chips; sending a message shows thinking dots → typing reveal; tool rows (if any) stagger in.
5. **Error:** force a bootstrap failure → red banner + "Try again" still works.
6. **Overflow:** paste/seed a long string into a proposed-action payload (or long URL in a reply) → wraps, no horizontal scroll.
7. **Reduced motion:** OS "reduce motion" on → shake/stagger/skeleton pulses are stilled (`motion-reduce` / `useReducedMotion`).
8. Gates: `npx tsc --noEmit`, `npx eslint`, `npx vitest run` all green (add a tiny test only if step-`ok` derivation logic is non-trivial).
9. *(Follow-up, needs key):* set `ANTHROPIC_API_KEY`, re-verify full-mode tool-call + approval + undo; banner disappears (`agentMode: "full"`).

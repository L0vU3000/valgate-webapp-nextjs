---
title: Words to Avoid — AI output, product copy & codebase
type: doc
status: living
source: research (AI-slop lists, naming anti-patterns, Inclusive Naming Initiative) + product-copy conventions
tags: [writing, voice, ui-copy, ai-slop, naming, code-smell, inclusive-language, style]
added: 2026-07-15
---

## Summary
Words and patterns the AI (and we) should not use. Organised into a **category
system** so rules can be cited by ID (e.g. "K2 violation"). Categories split
into three domains — **Copy**, **Codebase**, and **Cross-cutting** — because a
word banned on screen can be perfectly correct in code, and vice versa.

> For this to bind AI output it must be referenced from `CLAUDE.md`. This note is
> the reference; `CLAUDE.md` holds the short rule.

## Category system

| ID | Category | Domain | Applies to |
|---|---|---|---|
| **C1** | AI-slop vocabulary | Copy | UI copy, docs, marketing, **+ comments/commits/docstrings** |
| **C2** | Dev-framing leak | Copy | User-facing copy only |
| **C3** | Hype / overpromise | Copy | User-facing copy only |
| **K1** | Meaningless names | Codebase | identifiers |
| **K2** | Vague suffixes | Codebase | identifiers |
| **K3** | Type-encoding / Hungarian | Codebase | identifiers |
| **K4** | Confusing booleans | Codebase | identifiers |
| **K5** | Comment smells | Codebase | code comments |
| **K6** | Commit / PR smells | Codebase | commit messages, PR titles |
| **X1** | Non-inclusive language | Cross-cutting | code **and** copy **and** docs |

Rule of thumb: **Copy (C*)** = what a user reads. **Codebase (K*)** = how code is
named/commented. **Cross-cutting (X1)** = both. "MVP" is a C2 ban on screen but
fine in `roadmap.md`; naming a stub `mockUser` in code is fine (not a ban).

---

# Copy bans (user-facing text)

## C1 — AI-slop vocabulary
The dead giveaways of machine writing. Prefer the plain word. (Also applies to
commit messages, PR descriptions, comments, docstrings.)

- **Verbs:** delve → look at · leverage → use · utilize → use · harness → use ·
  streamline → simplify · underscore → show · facilitate → help · showcase →
  show · foster → build.
- **Adjectives:** robust, seamless, pivotal, innovative, cutting-edge,
  comprehensive, powerful, dynamic, intricate, nuanced, holistic, captivating,
  compelling, groundbreaking, remarkable, transformative → usually delete, or
  state the concrete fact.
- **Intensity modifiers:** critical, crucial, essential, fundamental,
  invaluable, paramount, vital.
- **Business jargon:** actionable insights → recommendations · best practices →
  proven methods · data-driven → evidence-based · paradigm shift → big change ·
  thought leadership → expertise · scalable → expandable · synergy → teamwork.
- **Filler nouns:** landscape, realm, tapestry, synergy, testament,
  underpinnings, ecosystem (vague).
- **Transitions:** furthermore, moreover, consequently, notably, importantly,
  additionally, accordingly, hence, thus, therefore, nevertheless → just start
  with the point.
- **Opening/hedging phrases:** "it's important to note", "it's worth noting",
  "generally speaking", "in many cases", "a journey of", "a plethora of",
  "in today's fast-paced world", "when it comes to", "dive deep",
  "Certainly, here is".
- **Structural tells:** "not just X, but Y" (LLMs write ~one per paragraph);
  weak endings ("in conclusion", "one thing is clear"); everything in
  rule-of-three lists; over-qualification; an em-dash in every sentence.

## C2 — Dev-framing leak (never in the product)
Internal framing that undersells the product. Fine in notes; **banned in any
user-facing string, label, empty state, or onboarding copy.**
- MVP, v1, v2, alpha, beta, POC, prototype, "phase 1"
- placeholder, dummy, mock, sample, TODO, "coming soon", WIP
- just, simply, easy, obviously, basic (condescending / usually untrue)
- test, temp, debug (dev leftovers)
→ Say what the thing *does* for the user, present tense.

## C3 — Hype / overpromise (never in copy)
game-changer, revolutionary, cutting-edge, world-class, best-in-class,
next-generation, effortless, magical, 10x, blazing-fast, state-of-the-art.
→ Replace with a specific, checkable claim, or nothing.

---

# Codebase bans (how code is named & commented)

## K1 — Meaningless names
foo, bar, baz, data, info, obj, val, temp, tmp, stuff, thing, item (when
unspecific), retval, result (vague), x/y/z (outside math), flag.
→ Name what it *holds* and *why*: `price`, not `value`; `pendingInvites`, not
`data`.

## K2 — Vague suffixes
Manager, Handler, Processor, Helper, Util/Utils, Wrapper, Data, Info, Service
(when it means nothing).
→ These hide what the code does. Name the responsibility: `InviteMailer`, not
`InviteHelper`; `priceCents`, not `priceData`.

## K3 — Type-encoding / Hungarian
strName, arrItems, bIsValid, `word_string`, `new_hash`; the `get`-prefix on
plain accessors (a Java-ism) in non-Java code.
→ The type system already knows the type. `name`, not `strName`.

## K4 — Confusing booleans
Negations and double-negatives: `isNotValid`, `notDisabled`, `hideNothing`.
→ Name the positive state: `isValid`, `isEnabled`. Reading `!notDisabled` at 3am
is how bugs happen.

## K5 — Comment smells
- Commented-out code left in place → delete it; git remembers.
- Comments that restate the code (`i++ // increment i`).
- Stale `TODO` / `FIXME` / `HACK` shipped and forgotten → fix, ticket, or remove.
  (See the project comment/error-handling judgment rules in `CLAUDE.md`.)

## K6 — Commit / PR smells
"fix", "wip", "update", "changes", "stuff", "misc", "asdf", "final", "final2".
→ Say what changed and why: `fix(auth): stop /launch redirect loop for Pro users`.

---

# Cross-cutting (code AND copy AND docs)

## X1 — Non-inclusive language
Replace across identifiers, comments, docs, and copy (Inclusive Naming
Initiative; adopted by Linux, Google, Twitter, etc.):

| Avoid | Use |
|---|---|
| blacklist / whitelist | denylist / allowlist (or blocklist) |
| master / slave | primary / replica · leader / follower · main |
| sanity check | confidence check · verification |
| dummy | placeholder · sample · stand-in |
| abort | cancel · stop · end |
| grandfathered | legacy · exempt |
| crazy / insane / cripple(d) | (reword — ableist) |
| man-hours / manpower | person-hours · effort |

---

## Ideology (the "why")
- **Write like a person, not a brochure.** Plain verbs, short sentences.
- **Specific beats generic** — in copy *and* names. "Verified by a licensed
  surveyor" > "trusted"; `pendingInvites` > `data`.
- **Cut, don't soften.** Delete the adjective before you weaken it.
- **Say what it does, not what stage it's at** (kills C2).
- **A name should answer: what does it hold, why does it exist, how is it used?**
- **Match the surrounding voice** — Valgate copy is calm and trustworthy, not salesy.

## Links
- [[glossary]] (the terms we DO use) · [[gotchas]] · [[obsidian]]

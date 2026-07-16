---
title: Delivery pipelines wrap installed capabilities
type: decision
status: accepted
tags: [agent-loop, delivery, pipelines, approvals, release]
added: 2026-07-17
---

## Context

Valgate's agent-loop needed delivery pipelines for landing, deployment, canary observation, and
release coordination. Installed skills already own the domain mechanics: `ship` prepares a change,
`setup-deploy` persists target configuration, `land-and-deploy` handles readiness/merge/deploy/revert,
`canary` performs bounded post-deploy observation, and `document-release` checks release notes.

## Decision

Delivery pipelines are thin wrappers around those capabilities. They separate approval by risk:

- `landing` verifies and merges one exact reviewed revision, then stops before deployment;
- `deploy` starts from one landed commit and targets one named environment;
- `canary` observes by default and requires a second approval for rollback;
- `release` attests notes, merge, deployment, and health evidence, then requires final owner sign-off
  on the exact release-record SHA-256.

All four stay in locked training mode until genuine work proves them. Eval uses authoritative remote,
provider, browser, and artifact evidence. No structural authoring run performs a live delivery action.
No external release is published until a proven publication capability exists.

## Consequences

- Provider and merge commands remain inside the installed skills instead of drifting across four
  pipeline definitions.
- One approval cannot silently authorize merge, production deploy, rollback, and release.
- Every pipeline keeps `explore → plan → execute → eval`, maker/verifier separation, locked scoring,
  bounded retries, failure memory, and Eval-to-Plan routing.
- Release candidates with missing pre-merge notes must return to `document-release`; already-landed
  changes cannot rewrite release history to manufacture notes.

## Revisit if

An installed skill gains stable subcommands for these exact boundaries, a target platform needs an
unsupported action, or a proven publication capability is added.

## Links

- [[agent-loop-pipeline-categories]] · [[pipeline-frontmatter-is-registry-source]]
- System detail: `agent-loop/memory/decisions.md`

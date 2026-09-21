# API client generation

`docs/api-spec/valgate-api-v1.yaml` is the single source of truth for the Valgate HTTP API
v1 contract. Everything below is generated *from* that file — never hand-edit a generated
client type, and never edit the spec from a lane that does not own it.

| Consumer | Generated artifact | Where the generator runs | Status |
|---|---|---|---|
| Web (Next.js) | `lib/api/v1/generated-types.ts` | this repo, on every push/PR | **wired** — `api-contract` CI job |
| iOS (SwiftUI) | `ValgateAPI` (swift-openapi-generator) | the **valgate-ios** repo's own CI | **not wired** — see the gap below |

## Web (TypeScript) — wired

```bash
npm run api:generate-ts   # spec → lib/api/v1/generated-types.ts (commit the result)
npm run api:check-ts      # regenerate to a temp file, diff; exit 1 if it disagrees
```

`api:check-ts` runs via `scripts/check-api-types.mjs` and is enforced by the `api-contract`
job in `.github/workflows/ci.yml`. Spec change without a regenerate = red CI.

Consumers should import from `@/lib/api/v1/generated-types` (`paths`/`operations`/
`components`) rather than re-declaring shapes. `lib/api/v1/dto.ts` remains the runtime
mapper from DB rows to wire shape — the generated types describe the wire shape, they do
not replace the mappers or their field-omission tests (`dto.test.ts`).

## iOS (Swift) — deliberate gap, must run in the iOS repo's own CI

**This repo's CI cannot generate the Swift client.** Concretely:

- the iOS sources are in a *different* GitHub repo (`l0vu3000/valgate-ios`) — this repo has
  no `ios/` directory, no `.xcodeproj`, and no submodule pointing at it;
- the macOS runner this job would need (`[self-hosted, macOS, xcode]`) is registered to
  `l0vu3000/valgate-ios`, not here — see the comment block at the bottom of
  `.github/workflows/ci.yml`. An iOS job in this repo can only sit `queued` until timeout.

So: cross-repo generation is **not** implemented. What this file records is the exact
command that would run in the iOS repo, plus the fact that it has to be wired there.

swift-openapi-generator is a SwiftPM *plugin*; it runs at build time, so wiring it means a
`Package.swift` in valgate-ios, not a shell step. The equivalent of `api:generate-ts`
(`--mode types`, types only, no client):

```bash
# run from the valgate-ios repo root, with the spec vendored into it
swift package --allow-writing-to-directory Sources/ValgateAPITypes \
  plugin \
  --package-path Packages/ValgateAPI \
  --allow-writing-to-package-directory \
  openapi-generator \
  generate \
  --config openapi-generator-config.yaml \
  docs/api-spec/valgate-api-v1.yaml
```

To make that reproducible the iOS repo needs two things it does not have today:

1. A **vendored copy of the spec**. GitHub Actions checkouts are per-repo, so the spec
   cannot be read from `valgate-webapp-nextjs` at build time. Either commit a copy under
   `docs/api-spec/` in valgate-ios (and drift-check it), or let CI `curl` the raw file from
   `l0vu3000/valgate-webapp-nextjs` at a pinned ref.
2. A **generated-types drift check in `valgate-ios/.github/workflows/ios.yml`** — the
   Swift analogue of `api:check-ts`: generate, `git diff --exit-code`, fail on any
   difference.

Today `Sources/ValgateiOS/Models/` holds hand-written DTOs (`MeDto.swift`,
`PropertyDto.swift`, `DocumentDto.swift`) with decoding tests. Those drift from the spec
silently — nothing in either repo fails when they do. Until the job above exists, that
drift is the iOS-side hole, and it is not fixed by this change.

## Change flow when the contract changes

1. Edit `docs/api-spec/valgate-api-v1.yaml` (spec owner only).
2. `npm run api:generate-ts` in the web repo, commit the regenerated file.
3. Update `lib/api/v1/dto.ts` mappers + route handlers if the wire shape changed.
4. On the iOS side, regenerate + fix the decoding tests (manual today — see the gap).

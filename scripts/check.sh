#!/usr/bin/env bash
# scripts/check.sh — the gate. Hermes runs this before opening any PR.
#
# Layered by speed: fast gates first, so a typo fails in seconds rather
# than after a five-minute Playwright run.
#
#   ./scripts/check.sh          fast gates + secret scan
#   ./scripts/check.sh --full   + e2e + visual regression
#   ./scripts/check.sh --ios    + push, then build on the Mac if reachable
#
# Exit non-zero on any failure. Never "fix" a failure by relaxing a gate.

set -euo pipefail

MODE="${1:-fast}"
MAC_HOST="${MAC_HOST:-mac.tailnet.ts.net}"
MAC_USER="${MAC_USER:-hermes}"
MAC_REPO="${MAC_REPO:-/Users/hermes/work/repo}"

step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
warn() { printf '\033[33m%s\033[0m\n' "$1"; }

# --- secret scan ------------------------------------------------------
# First, not last. A secret that reaches a commit is already a problem;
# catching it after ten minutes of tests doesn't help.
step "Secret scan"
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --staged --redact --verbose
else
  warn "gitleaks not installed — secret scanning SKIPPED. Install it."
fi

# --- fast gates -------------------------------------------------------
step "Web: typecheck"
pnpm typecheck

step "Web: lint"
pnpm lint

step "Web: unit tests"
pnpm test

step "AppCore: swift test"
# Includes .dump/.json snapshot assertions — these run on Linux, no Mac.
# If this repo doesn't have the iOS directory yet (two-repo setup),
# skip gracefully rather than fail.
if [[ -d "ios/Packages/AppCore" ]]; then
  swift test --package-path ios/Packages/AppCore
else
  warn "ios/Packages/AppCore not found — AppCore tests SKIPPED."
fi

# --- slow gates -------------------------------------------------------
if [[ "$MODE" == "--full" || "$MODE" == "--ios" ]]; then
  step "Web: production build"
  # Production build, not `next dev`. Dev compiles routes on demand,
  # which is what makes Playwright slow and flaky — and it renders
  # differently enough to invalidate screenshot baselines.
  pnpm build

  step "E2E + visual regression"
  # toHaveScreenshot() assertions live alongside the functional tests.
  # A diff here is a real signal: either a regression, or an intentional
  # change whose baseline needs updating and flagging in the PR.
  pnpm exec playwright test
fi

# --- ios, opportunistic ----------------------------------------------
# Never blocks. If the Mac is unreachable, CI picks this up on push,
# so a miss here is 'pending', not 'failed'.
if [[ "$MODE" == "--ios" ]]; then
  step "iOS: checking Mac reachability"

  if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$MAC_USER@$MAC_HOST" true 2>/dev/null; then
    warn "Mac offline — iOS unverified locally, will run in CI on push"
    printf '\n\033[32m✓ check.sh passed (iOS pending)\033[0m\n'
    exit 0
  fi

  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  SHA="$(git rev-parse HEAD)"

  step "iOS: pushing $BRANCH"
  # The Mac builds from its own clone. It cannot see this working tree,
  # so anything uncommitted is invisible to the build.
  git push -u origin "$BRANCH"

  step "iOS: building $SHA on Mac"
  ssh "$MAC_USER@$MAC_HOST" "
    set -euo pipefail
    cd '$MAC_REPO'
    git fetch origin '$BRANCH'
    git checkout -f '$SHA'
    # Guard against building the wrong commit — silent staleness here
    # would give feedback about code that isn't ours.
    test \"\$(git rev-parse HEAD)\" = '$SHA'
    cd ios
    tuist generate --no-open
    set -o pipefail   # load-bearing: without it the exit status comes
                      # from xcsift, which succeeds at parsing a FAILED
                      # build, so broken code reports green.
    xcodebuild test \\
      -workspace MyApp.xcworkspace \\
      -scheme MyApp \\
      -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \\
      | xcsift
  "
fi

printf '\n\033[32m✓ check.sh passed\033[0m\n'

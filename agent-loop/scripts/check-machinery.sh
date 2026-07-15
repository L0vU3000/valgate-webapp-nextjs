#!/usr/bin/env bash
# Smoke self-check for the agent-loop machinery itself ("test the tools").
# Fails loudly (exit 1) if any pipeline's scaffolding is broken:
#   1. every pipelines/*/workflow.js is syntactically valid ESM
#   2. every pipeline has the four stage files + pipeline.md
#   3. every workflow.js pins the shared run-id convention and a maker!=verifier
#      model override on its eval stage
#   4. runs/ folders are gitignored (run state must never be committed)
#   5. update-dashboard.sh actually parses a run folder (fixture round-trip)
# Run it after editing any workflow.js or the dashboard script:
#   bash agent-loop/scripts/check-machinery.sh
set -euo pipefail
cd "$(dirname "$0")/.."   # -> agent-loop/

fail=0
say()  { printf '%s\n' "$*"; }
bad()  { say "FAIL  $*"; fail=1; }
good() { say "ok    $*"; }

# --- 1+2+3: per-pipeline checks -------------------------------------------------
for dir in pipelines/*/; do
  name=$(basename "$dir")

  for f in pipeline.md explore.md plan.md execute.md eval.md; do
    if [ ! -f "$dir$f" ]; then
      bad "$name: missing $f"
    fi
  done

  wf="$dir/workflow.js"
  if [ ! -f "$wf" ]; then
    # A pipeline that isn't automated yet is allowed — note it, don't fail.
    say "note  $name: no workflow.js yet (not automated)"
    continue
  fi

  # Syntax check: the Workflow DSL is plain ESM JavaScript, so `node --check`
  # on a .mjs copy validates it without executing anything.
  # (macOS mktemp appends its random suffix at the END, so the .mjs extension has
  # to go on a fixed filename inside a temp dir, not on the template itself.)
  # The Workflow runtime executes the script body inside an async function (top-level
  # `return` and `await` are legal there), so the syntax check wraps it the same way.
  # `export const meta` becomes `const meta` since exports can't live in a function.
  tmpdir=$(mktemp -d -t "wfcheck-$name")
  tmp="$tmpdir/workflow.mjs"
  {
    echo 'async function __wfcheck() {'
    sed 's/^export const meta/const meta/' "$wf"
    echo '}'
  } > "$tmp"
  if node --check "$tmp" 2>/dev/null; then
    good "$name: workflow.js parses"
  else
    bad "$name: workflow.js has a syntax error:"
    node --check "$tmp" 2>&1 | sed 's/^/      /' || true
  fi
  rm -rf "$tmpdir"

  grep -q 'export const meta' "$wf" || bad "$name: workflow.js missing 'export const meta'"

  # Shared run-id lesson (memory/errors.md): explore mints ONE id, later stages reuse it.
  grep -q 'run-id' "$wf" || bad "$name: workflow.js doesn't thread the shared run-id"

  # maker != verifier: the eval agent must carry a model override.
  grep -q "model: 'sonnet'" "$wf" || bad "$name: eval stage has no different-model override"
done

# --- 4: run state must be gitignored --------------------------------------------
probe="pipelines/eslint-burndown/runs/_ignore-probe"
if git check-ignore -q "$probe"; then
  good "runs/ folders are gitignored"
else
  bad "runs/ folders are NOT gitignored — run state would be committed"
fi

# --- 5: dashboard parser round-trip ----------------------------------------------
# Plant a fixture run with a known verdict, regenerate, assert it shows up as
# completed, then remove the fixture and regenerate again to restore reality.
fixture="pipelines/zz-selfcheck/runs/0000-00-00-000000"
mkdir -p "$fixture"
printf 'verdict: pass\neslint: selfcheck\n' > "$fixture/eval.md"
bash scripts/update-dashboard.sh > /dev/null
if grep -q 'zz-selfcheck.*0000-00-00-000000.*pass' dashboard.md; then
  good "update-dashboard.sh parses run folders (fixture round-trip)"
else
  bad "update-dashboard.sh did not surface the fixture run in dashboard.md"
fi
rm -rf "pipelines/zz-selfcheck"
bash scripts/update-dashboard.sh > /dev/null

# --- verdict ---------------------------------------------------------------------
if [ "$fail" -ne 0 ]; then
  say "check-machinery: FAILED"
  exit 1
fi
say "check-machinery: all good"

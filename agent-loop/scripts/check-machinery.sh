#!/usr/bin/env bash
# Smoke self-check for the agent-loop machinery itself ("test the tools").
# Fails loudly (exit 1) if any pipeline's scaffolding is broken:
#   1. every pipelines/*/workflow.js is syntactically valid ESM
#   2. every pipeline has the four stage files + pipeline.md
#   3. every workflow.js pins the shared run-id convention and a maker!=verifier
#      model override on its eval stage
#   4. runs/ folders are gitignored (run state must never be committed)
#   5. update-dashboard.sh actually parses a run folder (fixture round-trip)
#   6. pipeline frontmatter agrees with all three registry tables
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

# --- registry metadata -----------------------------------------------------------
# Frontmatter is the canonical routing metadata. The three human-readable registries must
# repeat the same category/type/name triples exactly.
if node --test scripts/check-pipeline-registry.regression.mjs > /dev/null; then
  good "pipeline registry red-to-green regression check passes"
else
  bad "pipeline registry red-to-green regression check failed"
  node --test scripts/check-pipeline-registry.regression.mjs 2>&1 | sed 's/^/      /' || true
fi

if node scripts/check-pipeline-registry.mjs; then
  good "pipeline registry metadata agrees across all sources"
else
  bad "pipeline registry metadata drifted"
fi

# entity-scaffold is allowed to touch a development database, so its two approval gates are
# load-bearing. Keep a small static regression check until its first real run adds stronger
# runtime evidence.
entity_workflow="pipelines/entity-scaffold/workflow.js"
if [ -f "$entity_workflow" ]; then
  grep -q 'MIGRATION_APPROVED' "$entity_workflow" \
    && good "entity-scaffold: migration approval gate present" \
    || bad "entity-scaffold: migration approval gate missing"
  grep -q 'migrationSha256' "$entity_workflow" \
    && good "entity-scaffold: approved migration digest is threaded" \
    || bad "entity-scaffold: migration digest check missing"
  grep -q 'replan#' "$entity_workflow" \
    && good "entity-scaffold: eval failure returns to Plan" \
    || bad "entity-scaffold: eval failure does not return to Plan"
  grep -q 'memory#' "$entity_workflow" \
    && good "entity-scaffold: failure memory path present" \
    || bad "entity-scaffold: failure memory path missing"
  grep -q "model: 'opus'" "$entity_workflow" \
    && grep -q "model: 'sonnet'" "$entity_workflow" \
    && good "entity-scaffold: maker and verifier models differ" \
    || bad "entity-scaffold: maker/verifier model split missing"
  if grep -q 'training-off' "$entity_workflow"; then
    bad "entity-scaffold: unproven training mode can be disabled"
  else
    good "entity-scaffold: training mode is locked on"
  fi
fi

# pipeline-improve changes the machinery that guards every other pipeline. Its Plan approval,
# maker/verifier model split, failure memory, and executable stop bounds are load-bearing.
improve_workflow="pipelines/pipeline-improve/workflow.js"
if [ -f "$improve_workflow" ]; then
  grep -q -- '--approved-plan' "$improve_workflow" \
    && good "pipeline-improve: Plan approval gate present" \
    || bad "pipeline-improve: Plan approval gate missing"
  grep -q "model: 'opus'" "$improve_workflow" \
    && grep -q "model: 'sonnet'" "$improve_workflow" \
    && good "pipeline-improve: maker and verifier models differ" \
    || bad "pipeline-improve: maker/verifier model split missing"
  grep -q 'MAX_ATTEMPTS' "$improve_workflow" \
    && grep -q 'MAX_RUNTIME_MS' "$improve_workflow" \
    && grep -q 'MAX_AGENT_CALLS' "$improve_workflow" \
    && grep -q 'repeatCount >= 2' "$improve_workflow" \
    && good "pipeline-improve: attempt, runtime, call, and no-progress bounds present" \
    || bad "pipeline-improve: executable bounds are incomplete"
  grep -q 'memory#' "$improve_workflow" \
    && good "pipeline-improve: failure memory path present" \
    || bad "pipeline-improve: failure memory path missing"
  if grep -q 'training-off' "$improve_workflow"; then
    bad "pipeline-improve: training mode can be disabled"
  else
    good "pipeline-improve: training mode is locked on"
  fi
fi

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
printf 'verdict: pass\ncoverage: selfcheck 0%% → 100%%\n' > "$fixture/eval.md"
bash scripts/update-dashboard.sh > /dev/null
if grep -q 'zz-selfcheck.*0000-00-00-000000.*pass.*coverage: selfcheck' dashboard.md; then
  good "update-dashboard.sh parses verdict summaries (fixture round-trip)"
else
  bad "update-dashboard.sh did not surface the fixture verdict and summary"
fi
rm -rf "pipelines/zz-selfcheck"
bash scripts/update-dashboard.sh > /dev/null

# --- verdict ---------------------------------------------------------------------
if [ "$fail" -ne 0 ]; then
  say "check-machinery: FAILED"
  exit 1
fi
say "check-machinery: all good"

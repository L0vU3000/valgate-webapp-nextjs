#!/usr/bin/env bash
# PostToolUse hook — auto-mirror reminder for visual plans.
#
# Why a reminder and not a direct export: the Agent-Native CLI has no command to
# pull a hosted plan by id, so the mirror must be done by the agent via the Plan
# MCP (fetch content -> write docs/plans/). This hook just fires the nudge on the
# right events, keeping hosted review + a local git copy in sync.
#
# Fires the reminder only when it matters:
#   - a plan is CREATED (initial local copy), or
#   - an update sets status to "approved" or "complete" (the finalized copy).
# Stays silent during iterative content edits so it isn't noisy.
#
# Input: PostToolUse JSON on stdin ({ tool_name, tool_input, tool_response, ... }).
# Output: PostToolUse additionalContext JSON so the message reaches the agent.

input="$(cat)"

# Which plan tool ran, and the plan id (from tool_input on update, tool_response on create).
tool="$(printf '%s' "$input" | grep -oE 'mcp__plan__[a-z-]+' | head -n1)"
plan_id="$(printf '%s' "$input" | grep -oE 'plan-[a-z0-9]{8,}' | head -n1)"

remind=""
case "$tool" in
  *create-ui-plan*|*create-visual-plan*|*create-prototype-plan*|*create-plan-design*)
    remind=1 ;;
  *update-visual-plan*)
    # Only when this update finalizes the plan.
    printf '%s' "$input" | grep -qE '"status"[[:space:]]*:[[:space:]]*"(approved|complete)"' && remind=1 ;;
esac

# Nothing to do for ordinary iterative edits.
[ -z "$remind" ] && exit 0

msg="A visual plan was just created or finalized"
[ -n "$plan_id" ] && msg="$msg ($plan_id)"
msg="$msg. Per the user's standing convention, before ending this turn mirror it into docs/plans/: add or refresh the registry row in docs/plans/README.md and write/update the per-plan markdown (objective, locked decisions, design language, steps, code stubs, verification). Fetch the plan content via the Plan MCP if it is not already in context."

printf '%s' "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"$msg\"}}"

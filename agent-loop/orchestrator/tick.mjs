#!/usr/bin/env node

// Orchestrator heartbeat — ONE scheduled tick. This is the closing of the loop, as far as
// built-in primitives allow. Trigger it on a cadence (never a raw while(true) — the ADR):
//
//   /loop 30m node agent-loop/orchestrator/tick.mjs
//   (or a /schedule cloud routine that runs the same command)
//
// A tick is: plan -> refresh the board -> [agent runs each workflow.js on the Workflow
// runtime] -> record the outcome. The deterministic parts (plan + board) run here in code.
// The one agent-in-the-loop step is printed as an explicit action block, because a node
// process cannot invoke the harness Workflow runtime — so the scheduler wakes an AGENT,
// the agent runs this tick, does the printed Workflow calls, then records each outcome.

import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { planDispatch } from './dispatch.mjs'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const AGENT_LOOP_ROOT = resolve(SCRIPT_DIRECTORY, '..')

function refreshDashboard() {
  try {
    execFileSync('bash', [join(AGENT_LOOP_ROOT, 'scripts', 'update-dashboard.sh')], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const plan = planDispatch(AGENT_LOOP_ROOT)

if (!plan.registryOk) {
  for (const error of plan.registryErrors) {
    process.stderr.write(`FAIL  registry: ${error}\n`)
  }
  process.stderr.write('tick: registry broken — not routing this tick\n')
  process.exitCode = 1
} else {
  const board = refreshDashboard()
  process.stdout.write(
    `tick: ${plan.routable.length} routable, ${plan.invalid.length} invalid, `
    + `board ${board ? 'refreshed' : 'refresh FAILED'}\n`,
  )

  for (const item of plan.invalid) {
    process.stdout.write(`  INVALID  ${item.file} — ${item.reason} (return for correction)\n`)
  }

  if (plan.routable.length === 0) {
    process.stdout.write('tick: idle — nothing to dispatch.\n')
  } else {
    process.stdout.write('\nAGENT ACTIONS (priority order, one git worktree per run):\n')
    for (const item of plan.routable) {
      process.stdout.write(`\n• ${item.file}  ->  ${item.pipeline}\n`)
      if (item.automated) {
        process.stdout.write(`  1. Workflow({ scriptPath: "agent-loop/${item.workflow}" })   # explore→plan→execute→eval\n`)
      } else {
        process.stdout.write(`  1. no workflow.js — run agent-loop/pipelines/${item.pipeline}/{explore,plan,execute,eval}.md by hand\n`)
      }
      process.stdout.write(`  2. node agent-loop/orchestrator/dispatch.mjs --record ${item.file} <pass|fail> --summary "<one line>"\n`)
    }
    process.stdout.write(
      '\nBounds: honor each pipeline.md max-iterations / max-time; isolate per worktree; '
      + 'development DB only, never seed:reset. Pipelines with a Plan/approval gate stop for you.\n',
    )
  }
}

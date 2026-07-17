#!/usr/bin/env node

// Orchestrator dispatcher — one tick of the router described in orchestrator.md.
//
// What it does (deterministic, zero-token code — "code is the unsung hero"):
//   read inbox/*.md  ->  validate category+type against the canonical registry
//   ->  select the pipeline  ->  emit the dispatch plan in priority order.
//
// What it does NOT do: run a pipeline. A pipeline is a `workflow.js` executed by the
// built-in Workflow runtime (the harness), which a plain node process cannot invoke.
// So the dispatcher ROUTES and RECORDS; the runtime EXECUTES the emitted plan. That is
// exactly the spec's "it routes, it does not do the work itself".
//
// Registry source of truth: pipeline.md frontmatter, loaded via the same validator the
// machinery self-check uses (no second copy of the routing table to drift).
//
// Usage:
//   node agent-loop/orchestrator/dispatch.mjs            # print the dispatch plan
//   node agent-loop/orchestrator/dispatch.mjs --json     # machine-readable plan
//   node agent-loop/orchestrator/dispatch.mjs --record <file> <pass|fail> [--summary "..."]
//                                                        # finalize a run: move + changelog

import { existsSync, readFileSync, readdirSync, renameSync, mkdirSync, appendFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { validatePipelineRegistry } from '../scripts/check-pipeline-registry.mjs'
import { collectMetrics } from './metrics.mjs'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const DEFAULT_AGENT_LOOP_ROOT = resolve(SCRIPT_DIRECTORY, '..')

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 }

// A work item's frontmatter is a small subset — never require a `name` (that is a pipeline
// concept, not an inbox concept). Missing or malformed frontmatter is a validation result,
// not a crash. Exported so the work-item checker validates against the SAME parser the router
// uses — one source of truth, no drift.
export function parseItemFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return null
  }

  const metadata = {}
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) {
      continue
    }
    const key = line.slice(0, separator).trim()
    metadata[key] = line.slice(separator + 1).trim()
  }
  return metadata
}

function inboxItemFiles(inboxDirectory) {
  if (!existsSync(inboxDirectory)) {
    return []
  }

  // Top-level *.md only. done/ and failed/ are archives, not pending work.
  return readdirSync(inboxDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort()
}

// Pure planner: given the agent-loop root, return the routing decision for every inbox item.
// No side effects — this is the piece the regression test drives against fixtures.
export function planDispatch(agentLoopRoot = DEFAULT_AGENT_LOOP_ROOT) {
  const registry = validatePipelineRegistry(agentLoopRoot)
  const byType = new Map(registry.definitions.map((definition) => [definition.type, definition]))

  const inboxDirectory = join(agentLoopRoot, 'orchestrator', 'inbox')
  const items = []

  for (const file of inboxItemFiles(inboxDirectory)) {
    const frontmatter = parseItemFrontmatter(readFileSync(join(inboxDirectory, file), 'utf8'))

    if (!frontmatter || !frontmatter.category || !frontmatter.type) {
      items.push({ file, verdict: 'invalid', reason: 'missing category/type frontmatter' })
      continue
    }

    const { category, type } = frontmatter
    const priority = frontmatter.priority || 'normal'
    const pipeline = byType.get(type)

    if (!pipeline) {
      items.push({ file, category, type, priority, verdict: 'invalid', reason: `no pipeline registered for type "${type}"` })
      continue
    }

    // A category/type mismatch is invalid and returned for correction, never guessed.
    if (pipeline.category !== category) {
      items.push({
        file, category, type, priority, verdict: 'invalid',
        reason: `category "${category}" does not match pipeline ${pipeline.name} (category "${pipeline.category}")`,
      })
      continue
    }

    const workflow = join('pipelines', pipeline.name, 'workflow.js')
    items.push({
      file, category, type, priority, verdict: 'route',
      pipeline: pipeline.name,
      workflow,
      automated: existsSync(join(agentLoopRoot, workflow)),
    })
  }

  const routable = items
    .filter((item) => item.verdict === 'route')
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) || a.file.localeCompare(b.file))
  const invalid = items.filter((item) => item.verdict === 'invalid')

  return {
    registryOk: registry.ok,
    registryErrors: registry.errors,
    items,
    routable,
    invalid,
  }
}

// Bookkeeping half of the heartbeat: after the runtime finishes a run, move the item into
// its archive and append the outcome to memory. Additive appends + a file move only.
export function recordOutcome(agentLoopRoot, file, outcome, summary = '') {
  if (outcome !== 'pass' && outcome !== 'fail') {
    throw new Error(`outcome must be "pass" or "fail", got "${outcome}"`)
  }

  // `file` is an untrusted CLI argument that we join into paths and rename. An inbox item is
  // always a plain filename directly under inbox/ (e.g. "10-lint-normal.md"), so anything with a
  // directory part or "../" segment is either a bug or a traversal attempt — reject it before it
  // can move a file outside the inbox.
  if (!file || file !== basename(file) || file === '.' || file === '..') {
    throw new Error(`inbox item must be a plain filename, got "${file}"`)
  }

  const inboxDirectory = join(agentLoopRoot, 'orchestrator', 'inbox')
  const source = join(inboxDirectory, file)
  if (!existsSync(source)) {
    throw new Error(`inbox item not found: ${file}`)
  }

  const archiveName = outcome === 'pass' ? 'done' : 'failed'
  const archiveDirectory = join(inboxDirectory, archiveName)
  mkdirSync(archiveDirectory, { recursive: true })
  renameSync(source, join(archiveDirectory, file))

  const line = `- ${file} -> ${outcome}${summary ? ` (${summary})` : ''}\n`
  appendFileSync(join(agentLoopRoot, 'orchestrator', 'dispatch-log.md'), line)
  if (outcome === 'fail') {
    appendFileSync(join(agentLoopRoot, 'orchestrator', 'dispatch-log.md'), `  see memory/errors.md\n`)
  }

  return { moved: `inbox/${archiveName}/${file}` }
}

function cliRoot() {
  const rootOption = process.argv.find((argument) => argument.startsWith('--root='))
  return rootOption ? resolve(rootOption.slice('--root='.length)) : DEFAULT_AGENT_LOOP_ROOT
}

function runCli() {
  const args = process.argv.slice(2)
  const root = cliRoot()

  const recordIndex = args.indexOf('--record')
  if (recordIndex !== -1) {
    const file = args[recordIndex + 1]
    const outcome = args[recordIndex + 2]
    const summaryIndex = args.indexOf('--summary')
    const summary = summaryIndex !== -1 ? args[summaryIndex + 1] : ''
    if (!file || !outcome) {
      process.stderr.write('usage: --record <file> <pass|fail> [--summary "..."]\n')
      process.exitCode = 1
      return
    }
    const result = recordOutcome(root, file, outcome, summary)
    process.stdout.write(`recorded ${outcome}: moved to ${result.moved}\n`)
    // Harvest the runtime's cost/quality telemetry for any finished run into the ledger. A
    // hiccup here must never block the record itself — the outcome is already saved.
    try {
      const metrics = collectMetrics(root)
      if (metrics.added > 0) {
        process.stdout.write(`metrics: +${metrics.added} run(s) -> memory/run-metrics.jsonl\n`)
      }
    } catch (error) {
      process.stderr.write(`metrics harvest skipped: ${error.message}\n`)
    }
    return
  }

  const plan = planDispatch(root)

  if (!plan.registryOk) {
    for (const error of plan.registryErrors) {
      process.stderr.write(`FAIL  registry: ${error}\n`)
    }
    process.stderr.write('dispatch: refusing to route — the pipeline registry is broken\n')
    process.exitCode = 1
    return
  }

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
    return
  }

  if (plan.items.length === 0) {
    process.stdout.write('dispatch: inbox is empty — nothing to route\n')
    return
  }

  process.stdout.write('dispatch plan (priority order):\n')
  for (const item of plan.routable) {
    const runner = item.automated ? item.workflow : `${item.workflow} (no workflow.js — run stages by hand)`
    process.stdout.write(`  [${item.priority}] ${item.file}  ->  ${item.pipeline}  (${runner})\n`)
  }
  for (const item of plan.invalid) {
    process.stdout.write(`  INVALID  ${item.file}  ->  ${item.reason}\n`)
  }
  process.stdout.write(`\n${plan.routable.length} routable, ${plan.invalid.length} invalid\n`)
  if (plan.invalid.length > 0) {
    process.stdout.write('invalid items are returned for correction, never guessed.\n')
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  runCli()
}

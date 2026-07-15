// qa — automated pipeline runtime (built-in Workflow, no external deps).
// Pattern: drive routes and collect findings (explore) → plan fixes → fix (execute) → eval
// re-drives everything in a FRESH browser session, looped until all flows pass with a clean
// console. maker (execute) != verifier (eval); eval on a different model. One runId is
// minted in explore and threaded through every stage (lesson from memory/errors.md).
//
// Optionally pass routes as args, e.g.
// Workflow({scriptPath, args: '/, /property/PROP-0001/documents'})

export const meta = {
  name: 'qa',
  description: 'Browser-drive key routes, fix broken flows, verify with a fresh-session re-drive',
  phases: [{ title: 'Drive' }, { title: 'Fix loop' }],
}

const P = 'agent-loop/pipelines/qa'
const LINT = 'npx eslint app lib components'
const SCOPE = args || '(no routes passed — use the default scope in pipeline.md)'
const MAX = 5

const FINDINGS = { type: 'object', required: ['runId', 'findingCount'],
  properties: {
    runId: { type: 'string' },
    findingCount: { type: 'number' },
    findings: { type: 'array', items: { type: 'object', properties: {
      route: { type: 'string' },
      symptom: { type: 'string' },
      evidence: { type: 'string' },
    } } },
    note: { type: 'string' },
  } }

const VERDICT = { type: 'object', required: ['verdict', 'flowsPassing', 'consoleClean', 'networkClean', 'suiteGreen', 'tscErrors'],
  properties: {
    verdict: { enum: ['pass', 'fail'] },
    flowsPassing: { type: 'boolean' },
    consoleClean: { type: 'boolean' },
    networkClean: { type: 'boolean' },
    suiteGreen: { type: 'boolean' },
    tscErrors: { type: 'number' },
    evidence: { type: 'string' },
    reason: { type: 'string' },
  } }

phase('Drive')
const drive = await agent(
  `You are the EXPLORE stage of the qa pipeline. Follow ${P}/explore.md.
   Route scope: ${SCOPE}.
   First mint ONE run-id for this whole execution: \`date "+%Y-%m-%d-%H%M%S"\`, then
   \`mkdir -p ${P}/runs/<run-id>\` — every later stage writes ONLY into that folder.
   Use ToolSearch to load the Playwright browser tools and reproduce the browser setup in
   e2e/fixtures.ts. Reuse the dev server on port 3001 if it answers; otherwise start
   \`npm run dev:e2e\` in the background. NEVER wait on
   networkidle. Confirm .env.local is not the prod endpoint (ep-aged-cloud-*) before flows
   that write. Use \`graphify query\` to orient before reading code. Record per-route status
   and ranked findings with evidence. Return runId and findingCount (0 if nothing is broken).`,
  { label: 'explore', schema: FINDINGS })

const RUN = drive.runId

if (drive.findingCount === 0) {
  const cleanVerdict = await agent(
    `You are the EVAL stage (an independent VERIFIER). Follow ${P}/eval.md. Write your
     verdict to \`${P}/runs/${RUN}/eval.md\`. Use a FRESH browser session and reproduce
     e2e/fixtures.ts. Re-drive every route from \`${P}/runs/${RUN}/explore.md\`, then run
     \`npx vitest run\`, \`npx tsc --noEmit\`, and \`${LINT}\`.`,
    { label: 'eval-clean', schema: VERDICT, model: 'sonnet' })

  const clean = cleanVerdict.verdict === 'pass' && cleanVerdict.flowsPassing &&
    cleanVerdict.consoleClean && cleanVerdict.networkClean && cleanVerdict.suiteGreen &&
    cleanVerdict.tscErrors === 0
  log(`run ${RUN} — independent clean-run verification ${clean ? 'passed' : 'FAILED'}.`)
  return { clean, runId: RUN }
}

log(`run ${RUN} — ${drive.findingCount} finding(s). Entering fix loop.`)

phase('Fix loop')
let i = 0
let last = null
while (i < MAX) {
  i++

  await agent(
    `You are the PLAN stage. Follow ${P}/plan.md. Write only into \`${P}/runs/${RUN}/\`.
     Findings: ${JSON.stringify(drive.findings || [])}.
     ${last ? `Previous attempt failed eval: ${last}. Adjust.` : ''}
     Plan the smallest root-cause fix per finding; mark product/design judgment calls as
     escalate instead of planning them.`,
    { label: `plan#${i}`, phase: 'Fix loop' })

  await agent(
    `You are the EXECUTE stage (MAKER). Follow ${P}/execute.md. Write only into
     \`${P}/runs/${RUN}/\` and the planned fix locations. Apply exactly the planned fixes.
     Skip findings marked escalate. Never silence errors instead of fixing them.`,
    { label: `execute#${i}`, phase: 'Fix loop' })

  const v = await agent(
    `You are the EVAL stage (VERIFIER — a DIFFERENT agent from the maker). Follow ${P}/eval.md.
     Write your verdict to \`${P}/runs/${RUN}/eval.md\`. Use ToolSearch to load the Playwright
     tools; use a FRESH browser session (close any open tabs first, or open a new context).
     Reproduce the shared e2e/fixtures.ts browser setup. Re-drive every in-scope flow from
     \`${P}/runs/${RUN}/explore.md\`; console and network must be free of product errors;
     then \`npx vitest run\` (green), \`npx tsc --noEmit\` (0), \`${LINT}\` (no new warnings).
     Run the anti-gaming diff review from eval.md. Return the verdict with cited evidence.`,
    { label: `eval#${i}`, phase: 'Fix loop', schema: VERDICT, model: 'sonnet' })

  log(`iter ${i}: flows ${v.flowsPassing ? 'pass' : 'FAIL'} · console ${v.consoleClean ? 'clean' : 'DIRTY'} · network ${v.networkClean ? 'clean' : 'DIRTY'} · suite ${v.suiteGreen ? 'green' : 'RED'} · tsc ${v.tscErrors}`)

  if (v.verdict === 'pass' && v.flowsPassing && v.consoleClean && v.networkClean && v.suiteGreen && v.tscErrors === 0) {
    log(`DONE: all in-scope flows verified in a fresh session.`)
    return { fixed: true, iterations: i, runId: RUN }
  }
  last = v.reason || v.evidence || 'checks failed'
}

log(`STOP: not clean within ${MAX} iterations — handing back to a human.`)
return { fixed: false, iterations: i, runId: RUN }

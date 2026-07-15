import assert from 'node:assert/strict'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir as operatingSystemTemporaryDirectory } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { planDispatch, recordOutcome } from '../orchestrator/dispatch.mjs'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const SOURCE_ROOT = resolve(SCRIPT_DIRECTORY, '..')

// Copy just enough of the real agent-loop for validatePipelineRegistry to pass in the fixture:
// the three registry docs plus every pipeline's frontmatter. The dispatcher reads its routing
// table from that same canonical source, so the fixture exercises the real registry.
function copyRegistryFixture(destinationRoot) {
  mkdirSync(join(destinationRoot, 'pipelines'), { recursive: true })
  mkdirSync(join(destinationRoot, 'orchestrator'), { recursive: true })
  cpSync(join(SOURCE_ROOT, 'categories.md'), join(destinationRoot, 'categories.md'))
  cpSync(join(SOURCE_ROOT, 'pipelines', 'README.md'), join(destinationRoot, 'pipelines', 'README.md'))
  cpSync(join(SOURCE_ROOT, 'orchestrator', 'orchestrator.md'), join(destinationRoot, 'orchestrator', 'orchestrator.md'))
  for (const entry of readdirSync(join(SOURCE_ROOT, 'pipelines'))) {
    const sourceDirectory = join(SOURCE_ROOT, 'pipelines', entry)
    if (!statSync(sourceDirectory).isDirectory()) {
      continue
    }
    const destinationDirectory = join(destinationRoot, 'pipelines', entry)
    mkdirSync(destinationDirectory, { recursive: true })
    cpSync(join(sourceDirectory, 'pipeline.md'), join(destinationDirectory, 'pipeline.md'))
  }
}

function writeItem(inboxDirectory, name, frontmatter) {
  const body = frontmatter
    ? `---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\nwork item\n`
    : 'no frontmatter here\n'
  writeFileSync(join(inboxDirectory, name), body)
}

test('dispatcher routes valid items, rejects mismatches, orders by priority, records outcomes', () => {
  const fixtureRoot = mkdtempSync(join(operatingSystemTemporaryDirectory(), 'dispatch-check-'))

  try {
    copyRegistryFixture(fixtureRoot)
    const inbox = join(fixtureRoot, 'orchestrator', 'inbox')
    mkdirSync(inbox, { recursive: true })

    // Two well-formed items on real registry pairs, plus three that must be rejected.
    writeItem(inbox, '05-e2e-high.md', { category: 'testing', type: 'e2e', priority: 'high', created: '2026-07-16' })
    writeItem(inbox, '10-lint-normal.md', { category: 'maintenance', type: 'lint', priority: 'normal', created: '2026-07-16' })
    writeItem(inbox, '20-mismatch.md', { category: 'building', type: 'e2e', priority: 'normal', created: '2026-07-16' })
    writeItem(inbox, '30-unknown-type.md', { category: 'building', type: 'banana', priority: 'normal', created: '2026-07-16' })
    writeItem(inbox, '40-no-frontmatter.md', null)
    // An archived item under done/ must be ignored, not routed.
    mkdirSync(join(inbox, 'done'), { recursive: true })
    writeItem(join(inbox, 'done'), '00-archived.md', { category: 'testing', type: 'e2e' })

    const plan = planDispatch(fixtureRoot)
    assert.equal(plan.registryOk, true, plan.registryErrors.join('\n'))

    // Routing: two routable, three invalid; archived item ignored.
    assert.equal(plan.routable.length, 2, JSON.stringify(plan.routable))
    assert.equal(plan.invalid.length, 3, JSON.stringify(plan.invalid))

    // Priority order: high before normal, regardless of filename.
    assert.equal(plan.routable[0].file, '05-e2e-high.md')
    assert.equal(plan.routable[0].pipeline, 'e2e-regression')
    assert.equal(plan.routable[1].file, '10-lint-normal.md')
    assert.equal(plan.routable[1].pipeline, 'eslint-burndown')

    // Each invalid item carries a specific, actionable reason.
    const reasonFor = (file) => plan.invalid.find((item) => item.file === file)?.reason ?? ''
    assert.match(reasonFor('20-mismatch.md'), /does not match pipeline/)
    assert.match(reasonFor('30-unknown-type.md'), /no pipeline registered for type "banana"/)
    assert.match(reasonFor('40-no-frontmatter.md'), /missing category\/type frontmatter/)

    // Bookkeeping: recording a pass moves the item into done/ and drops it from the next plan.
    recordOutcome(fixtureRoot, '10-lint-normal.md', 'pass', 'green')
    assert.ok(!existsSync(join(inbox, '10-lint-normal.md')), 'recorded item must leave the inbox root')
    assert.ok(existsSync(join(inbox, 'done', '10-lint-normal.md')), 'recorded item must land in done/')

    const afterPlan = planDispatch(fixtureRoot)
    assert.equal(afterPlan.routable.length, 1, 'the recorded item is no longer pending')
    assert.equal(afterPlan.routable[0].file, '05-e2e-high.md')
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true })
  }
})

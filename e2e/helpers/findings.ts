/**
 * Append findings to QA-FINDINGS.md as specs run.
 * Uses appendFileSync — safe for small atomic writes across parallel workers.
 */
import { appendFileSync } from 'fs'
import { resolve } from 'path'

const FILE = resolve(process.cwd(), 'e2e', 'QA-FINDINGS.md')

export function pass(section: string, item: string): void {
  appendFileSync(FILE, `\n- ✅ **${section}**: ${item}`)
}

export function fail(section: string, item: string, detail: string): void {
  appendFileSync(FILE, `\n- ❌ **${section}**: ${item} — ${detail}`)
}

export function skip(section: string, item: string, reason: string): void {
  appendFileSync(FILE, `\n- ⏭️  **${section}**: ${item} — SKIP: ${reason}`)
}

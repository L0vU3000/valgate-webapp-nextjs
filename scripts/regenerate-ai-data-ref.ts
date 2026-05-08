/**
 * Regenerate ai-data-ref/*.md from ref/07/08/09.
 *
 * Strips prose; keeps headings, tables, code blocks, lists, blockquotes,
 * and frontmatter. Writes to *.generated.md siblings so the user can diff
 * against hand-curated files before deciding to overwrite.
 *
 * Usage: npm run regen-ai-ref
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd(), ".claude/data-audit");

const SOURCES = [
  {
    src: `${ROOT}/ref/07-entity-fields.md`,
    out: `${ROOT}/ai-data-ref/entities.generated.md`,
    title: "Entities",
    sourceRel: "../ref/07-entity-fields.md",
  },
  {
    src: `${ROOT}/ref/09-page-wiring-status.md`,
    out: `${ROOT}/ai-data-ref/pages.generated.md`,
    title: "Pages",
    sourceRel: "../ref/09-page-wiring-status.md",
  },
  {
    src: `${ROOT}/ref/08-backend-migration-readiness.md`,
    out: `${ROOT}/ai-data-ref/migration.generated.md`,
    title: "Migration",
    sourceRel: "../ref/08-backend-migration-readiness.md",
  },
];

function distill(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];

  let inFence = false;
  let inFrontmatter = false;
  let prevBlank = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Frontmatter: first --- opens, second --- closes
    if (trimmed === "---" && i === 0) {
      inFrontmatter = true;
      out.push(line);
      prevBlank = false;
      continue;
    }
    if (inFrontmatter) {
      out.push(line);
      if (trimmed === "---") inFrontmatter = false;
      prevBlank = false;
      continue;
    }

    // Code-fence toggle
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      out.push(line);
      prevBlank = false;
      continue;
    }
    if (inFence) {
      out.push(line);
      prevBlank = false;
      continue;
    }

    // Blank — collapse runs to a single blank
    if (trimmed === "") {
      if (!prevBlank && out.length > 0) out.push("");
      prevBlank = true;
      continue;
    }

    // Structural lines we keep
    const isStructural =
      /^#{1,6}\s/.test(trimmed) || // heading
      trimmed.startsWith("|") || // table row
      /^[-*+]\s/.test(trimmed) || // bullet
      /^\d+\.\s/.test(trimmed) || // numbered list
      trimmed.startsWith(">") || // blockquote
      /^---+$/.test(trimmed); // hr / table separator

    if (isStructural) {
      out.push(line);
      prevBlank = false;
    }
    // else: drop the prose line silently
  }

  // Trim trailing blanks
  while (out.length > 0 && out[out.length - 1].trim() === "") out.pop();

  return out.join("\n") + "\n";
}

function buildHeader(title: string, sourceRel: string): string {
  return [
    `# ${title} — AI ref (auto-generated)`,
    "",
    "> ⚠️ **Auto-generated.** Edit \`" + sourceRel + "\` and re-run \`npm run regen-ai-ref\`.",
    "> Manual edits will be overwritten. If something important got stripped, add it",
    "> to the source file as a heading/table/list and re-run.",
    "",
  ].join("\n");
}

function main() {
  let totalSrc = 0;
  let totalOut = 0;

  for (const { src, out, title, sourceRel } of SOURCES) {
    const raw = readFileSync(src, "utf8");
    // Strip the original title heading (we replace with our auto-generated header)
    const distilled = distill(raw).replace(/^---[\s\S]*?---\n/, ""); // drop frontmatter
    const stripped = distilled.replace(/^#\s.*\n+/, ""); // drop original h1

    const result = buildHeader(title, sourceRel) + stripped;
    writeFileSync(out, result, "utf8");

    const srcSize = Buffer.byteLength(raw, "utf8");
    const outSize = Buffer.byteLength(result, "utf8");
    totalSrc += srcSize;
    totalOut += outSize;

    const pct = ((outSize / srcSize) * 100).toFixed(0);
    console.log(`${out.replace(ROOT + "/", "")}: ${(outSize / 1024).toFixed(1)} KB (${pct}% of source)`);
  }

  const totalPct = ((totalOut / totalSrc) * 100).toFixed(0);
  console.log(`\nTotal: ${(totalOut / 1024).toFixed(1)} KB / ${(totalSrc / 1024).toFixed(1)} KB (${totalPct}%)`);
  console.log(`\nWrote *.generated.md siblings. Diff against the hand-curated files to decide whether to overwrite.`);
}

main();

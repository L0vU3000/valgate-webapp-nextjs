import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

// ─────────────────────────────────────────────────────────────────────────────
// Field-first workbook import engine (generic, entity-agnostic).
//
// The old importer was SHEET-first: "which sheet is the property register? map
// its columns." That breaks on real client workbooks, which are fragmented — a
// single Valgate entity (a tenant, say) is spread across several sheets and
// joined by an ID that differs from workbook to workbook.
//
// This engine is FIELD-first instead. The end goal is a FIXED, small Valgate
// entity (its field list). So we drive from that: for EACH target field, ask the
// AI "where in this whole workbook does this value come from?" — a column in one
// sheet, a column in another sheet joined by a key, or nowhere (→ default/flag).
// Fragmentation stops mattering: whether the fields live in 1 sheet or 3, the
// per-field question is identical, and a single-sheet workbook is just the case
// where every field points at the same sheet with no joins.
//
// One engine, many entities: callers supply a FieldSpec[] (see tenant-import.ts)
// and get back assembled rows. Nothing here is tenant- or property-specific.
// ─────────────────────────────────────────────────────────────────────────────

// A parsed worksheet: its name, its header row, and its header-keyed data rows.
export type SheetData = {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
};

// One Valgate field the importer wants to fill, described so the AI can source it.
export type FieldSpec = {
  // The target field name (matches the key we want in the assembled row).
  field: string;
  // When true, a row is flagged if this field ends up empty.
  required: boolean;
  // Plain-English meaning of the value — steers the AI's column matching.
  description: string;
};

// Where a single field's value comes from in the workbook, or null if nowhere.
export type FieldSource = { sheet: string; column: string } | null;

// One join: how to pull a row from another sheet onto the primary row. Both sides
// are named explicitly — joinColumn in the other sheet must equal primaryColumn in
// the primary sheet — so the AI can join on WHATEVER column actually corresponds
// (e.g. a name, when the ID columns are blank/degenerate in one sheet).
export type Join = { sheet: string; joinColumn: string; primaryColumn: string };

// The AI's field-first sourcing plan for one entity across the WHOLE workbook.
export type FieldPlan = {
  // The sheet that has one row per entity (the row we iterate to produce records).
  primarySheet: string;
  // Every OTHER sheet a field is pulled from, with the columns that link it back to
  // the primary sheet. Empty for single-sheet workbooks.
  joins: Join[];
  // For each target field: where its value lives (or null = not found anywhere).
  sources: Record<string, FieldSource>;
};

// Normalize a join value so trivial formatting differences (case, surrounding or
// doubled whitespace) don't break an otherwise-correct match — important when the
// join is on a name that was typed slightly differently in two sheets.
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// One assembled entity: the resolved value for each field, plus the required
// fields that came back empty (so the caller can flag them for review).
export type AssembledRow = {
  values: Record<string, string>;
  missing: string[];
};

// Ask the model ONCE to produce a field-sourcing plan. Only sheet names, headers,
// and a few sample rows are sent (no full dataset, no secrets). Returns null when
// the API key is missing, the call fails, or the model's plan is unusable — so the
// caller can degrade to manual mapping instead of crashing.
export async function planFieldSources(
  sheets: SheetData[],
  fields: FieldSpec[],
  entityName: string,
): Promise<FieldPlan | null> {
  if (!env.OPENAI_API_KEY) return null;
  if (sheets.length === 0) return null;

  // Build the response schema dynamically so the model returns exactly one source
  // (sheet + column, each nullable) per target field. Matches property-import's
  // dynamic-schema approach so the two never drift in style.
  const sourcesSchema = z.object(
    Object.fromEntries(
      fields.map((f) => [
        f.field,
        z.object({
          sheet: z.string().nullable(),
          column: z.string().nullable(),
        }),
      ]),
    ) as Record<string, z.ZodObject<{ sheet: z.ZodNullable<z.ZodString>; column: z.ZodNullable<z.ZodString> }>>,
  );

  const planSchema = z.object({
    primarySheet: z.string().describe(`Name of the sheet that is a register of ${entityName}s — ONE ROW PER ${entityName}.`),
    joins: z
      .array(
        z.object({
          sheet: z.string().describe("Another sheet you pull one or more fields from."),
          joinColumn: z.string().describe("Column in THAT sheet used to match rows back to the primary sheet."),
          primaryColumn: z.string().describe("Column in primarySheet whose value equals joinColumn's value (the join condition)."),
        }),
      )
      .describe("One entry per OTHER sheet referenced by any field source. Empty when every field lives in primarySheet."),
    sources: sourcesSchema,
  });

  // Compact preview: name + headers + up to 3 sample rows per sheet. Enough for
  // the model to understand each sheet's shape without shipping the whole file.
  const preview = sheets.map((s) => ({
    sheet: s.name,
    headers: s.headers,
    sampleRows: s.rows.slice(0, 3),
  }));

  const fieldList = fields.map((f) => `- ${f.field}${f.required ? " (required)" : ""}: ${f.description}`).join("\n");

  try {
    const { object } = await generateObject({
      // The plan is ONE call per import but decides the correctness of the whole migration (which
      // columns, which joins). It's reasoning-heavy — smaller models were inconsistent on the join
      // step — so use GPT-5.5. No temperature: it's a reasoning model (temperature is unsupported);
      // join determinism is guaranteed downstream in code by repairJoins, not by sampling.
      model: openai("gpt-5.5"),
      schema: planSchema,
      prompt: [
        `You are migrating data from a client's multi-sheet workbook into Valgate's fixed "${entityName}" record.`,
        "Work FIELD-FIRST: for EACH target field below, find the ONE column, ANYWHERE in the workbook, whose",
        "DATA genuinely is that field. The column may be in any sheet — real workbooks split one record across",
        "several sheets (e.g. identity in one sheet, financials/links in another).",
        "",
        "Target fields:",
        fieldList,
        "",
        "Rules:",
        `- primarySheet = the sheet that lists one ${entityName} per row (the record register).`,
        "- PREFER primarySheet for each field: if a suitable column exists IN primarySheet, source the field",
        "  from there. Only source a field from another sheet (via a join) when primarySheet has NO suitable",
        "  column for it. This keeps every record's own columns (name, contact, etc.) populated even for rows",
        "  that have no matching row in a secondary sheet.",
        "- If a REQUIRED field's data lives in a DIFFERENT sheet, you MUST create a join for that sheet — never",
        "  leave a required field unsourced just to avoid joining. The sheet appears in joins telling us how to",
        "  match its rows to the primary sheet: joinColumn (in that sheet) equals primaryColumn (in primarySheet).",
        "- CHOOSE JOIN COLUMNS BY THE SAMPLE DATA, not just the header names. The two columns' VALUES must",
        "  actually correspond and be real. If an ID column is blank, 0, or empty in the sample rows of EITHER",
        "  sheet, do NOT join on it — pick a different pair whose values match (a full name column is usually a",
        "  reliable fallback when IDs are missing).",
        "- For each field, return { sheet, column }. If the value genuinely is not present ANYWHERE, return",
        "  { sheet: null, column: null } — do NOT force a loose match. Never invent a sheet or column name.",
        "- A single-sheet workbook is fine: every field points at primarySheet and joins is empty.",
        "",
        `Workbook (each sheet: name, headers, up to 3 sample rows): ${JSON.stringify(preview)}`,
      ].join("\n"),
    });

    return sanitizePlan(object as RawPlan, sheets, fields);
  } catch (err) {
    log.warn("entity-import planFieldSources failed", { entity: entityName, err: String(err) });
    return null;
  }
}

// Shape the model returns before we validate it against the real workbook.
export type RawPlan = {
  primarySheet: string;
  joins: { sheet: string; joinColumn: string; primaryColumn: string }[];
  sources: Record<string, { sheet: string | null; column: string | null }>;
};

// Reject anything that does not point at a real sheet/column, so a hallucinated
// name can never reach assembleRows. Returns null if the plan is unusable.
export function sanitizePlan(raw: RawPlan, sheets: SheetData[], fields: FieldSpec[]): FieldPlan | null {
  const byName = new Map(sheets.map((s) => [s.name, s]));

  const primary = byName.get(raw.primarySheet);
  if (!primary) return null;

  // Keep joins whose sheet exists, whose joinColumn is real in that sheet, and
  // whose primaryColumn is real in the primary sheet. Anything else is unusable.
  const joins = (raw.joins ?? []).filter((j) => {
    const s = byName.get(j.sheet);
    return Boolean(s && s.headers.includes(j.joinColumn) && primary.headers.includes(j.primaryColumn));
  });
  const joinSheets = new Set(joins.map((j) => j.sheet));

  const sources: Record<string, FieldSource> = {};
  for (const f of fields) {
    const src = raw.sources?.[f.field];
    if (!src || !src.sheet || !src.column) {
      sources[f.field] = null;
      continue;
    }
    const s = byName.get(src.sheet);
    if (!s || !s.headers.includes(src.column)) {
      sources[f.field] = null;
      continue;
    }
    // A field in a non-primary sheet is only usable if we have a valid join for it.
    if (src.sheet !== primary.name && !joinSheets.has(src.sheet)) {
      sources[f.field] = null;
      continue;
    }
    sources[f.field] = { sheet: src.sheet, column: src.column };
  }

  // The model proposed the join COLUMNS, but it can trust a column that is blank/degenerate in the
  // real data (e.g. an ID that is 0 for every row). Verify each join against the actual values and
  // repair it — so linkage is deterministic, not dependent on the model guessing the one good column.
  const repairedJoins = repairJoins(sheets, primary.name, joins);

  return { primarySheet: primary.name, joins: repairedJoins, sources };
}

// How many primary rows find a matching row in the other sheet on this column pair (normalized).
function countJoinMatches(primary: SheetData, other: SheetData, primaryColumn: string, joinColumn: string): number {
  const otherKeys = new Set<string>();
  for (const row of other.rows) {
    const key = normalizeKey(row[joinColumn] ?? "");
    if (key) otherKeys.add(key);
  }
  let matches = 0;
  for (const row of primary.rows) {
    const key = normalizeKey(row[primaryColumn] ?? "");
    if (key && otherKeys.has(key)) matches++;
  }
  return matches;
}

// A column is worth joining ON only if its values are mostly present and mostly distinct — that
// rules out a degenerate ID (all "0" → not distinct) and a category column like Country (few distinct
// values repeated across rows), either of which would produce a spurious or empty join.
function isJoinableColumn(sheet: SheetData, column: string): boolean {
  const values = sheet.rows.map((r) => normalizeKey(r[column] ?? "")).filter(Boolean);
  if (values.length < sheet.rows.length * 0.5) return false; // too many blanks
  const distinct = new Set(values).size;
  return distinct >= values.length * 0.6;
}

// For each join, if some OTHER (primaryColumn, joinColumn) pair links strictly more rows, use it.
// Pure + deterministic; O(primaryCols × joinCols × rows), trivial for real workbook sizes.
// ponytail: greedy best-match with a distinctness guard; if two unrelated columns ever shared enough
// distinct values to out-score the real key, this could mislink — revisit only if that shows up.
export function repairJoins(sheets: SheetData[], primarySheet: string, joins: Join[]): Join[] {
  const byName = new Map(sheets.map((s) => [s.name, s]));
  const primary = byName.get(primarySheet);
  if (!primary) return joins;

  return joins.map((join) => {
    const other = byName.get(join.sheet);
    if (!other) return join;

    let best = join;
    let bestScore = countJoinMatches(primary, other, join.primaryColumn, join.joinColumn);

    for (const primaryColumn of primary.headers) {
      if (!isJoinableColumn(primary, primaryColumn)) continue;
      for (const joinColumn of other.headers) {
        if (!isJoinableColumn(other, joinColumn)) continue;
        const score = countJoinMatches(primary, other, primaryColumn, joinColumn);
        if (score > bestScore) {
          bestScore = score;
          best = { sheet: join.sheet, joinColumn, primaryColumn };
        }
      }
    }
    return best;
  });
}

// Apply a plan to the workbook → one assembled row per record in primarySheet.
// PURE and deterministic (no AI, no DB) so it is unit-testable in node: iterate
// the primary sheet, and for each field read its value from the primary row or —
// when the field lives in another sheet — from the joined row matched on the key.
export function assembleRows(sheets: SheetData[], plan: FieldPlan, fields: FieldSpec[]): AssembledRow[] {
  const byName = new Map(sheets.map((s) => [s.name, s]));
  const primary = byName.get(plan.primarySheet);
  if (!primary) return [];

  // For each join sheet, build a normalized joinColumn-value → row lookup (first
  // row wins on duplicate keys), and remember which primary column to match on.
  const joinBySheet = new Map<string, { primaryColumn: string; index: Map<string, Record<string, string>> }>();
  for (const join of plan.joins) {
    const sheet = byName.get(join.sheet);
    if (!sheet) continue;
    const index = new Map<string, Record<string, string>>();
    for (const row of sheet.rows) {
      const key = normalizeKey(row[join.joinColumn] ?? "");
      if (key && !index.has(key)) index.set(key, row);
    }
    joinBySheet.set(join.sheet, { primaryColumn: join.primaryColumn, index });
  }

  const assembled = primary.rows.map((primaryRow) => {
    const values: Record<string, string> = {};
    const missing: string[] = [];

    for (const f of fields) {
      const source = plan.sources[f.field];
      let value = "";

      if (source) {
        if (source.sheet === plan.primarySheet) {
          value = (primaryRow[source.column] ?? "").trim();
        } else {
          const join = joinBySheet.get(source.sheet);
          const matchValue = join ? normalizeKey(primaryRow[join.primaryColumn] ?? "") : "";
          const joinedRow = join && matchValue ? join.index.get(matchValue) : undefined;
          value = (joinedRow?.[source.column] ?? "").trim();
        }
      }

      values[f.field] = value;
      if (f.required && !value) missing.push(f.field);
    }

    return { values, missing };
  });

  // Drop rows that carry NO record data at all. Real workbooks pad the register with blank template
  // rows that still hold a stray constant (e.g. a formula-filled "0" in an ID column), which slips past
  // the raw empty-row filter and would otherwise become phantom records. A row with every mapped field
  // empty is not a record.
  return assembled.filter((row) => Object.values(row.values).some((v) => v !== ""));
}

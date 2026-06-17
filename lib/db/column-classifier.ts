import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

// Single source of truth for drizzle columnType → conversion kind (C6/C7).
// Used by toDomain (read) and toRow (seed/write). Extend here when new PG types appear.
export type ColumnKind = "timestamp" | "numeric" | "plain";

export function classifyColumn(columnType: string): ColumnKind {
  if (columnType === "PgTimestamp") return "timestamp";
  if (columnType === "PgNumeric") return "numeric";
  return "plain";
}

export function domainFromDb(kind: ColumnKind, val: unknown): unknown {
  if (kind === "timestamp" && val instanceof Date) return val.getTime();
  if (kind === "numeric" && typeof val === "string") return Number(val);
  return val;
}

export function dbFromDomain(kind: ColumnKind, val: unknown): unknown {
  if (kind === "timestamp" && typeof val === "number") return new Date(val);
  if (kind === "numeric" && typeof val === "number") return String(val);
  return val;
}

type ColMeta = { columnType: string };

export function convertRowToDomain(
  table: PgTable,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const cols = getTableColumns(table) as Record<string, ColMeta>;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === null) { out[key] = undefined; continue; }
    const kind = classifyColumn(cols[key]?.columnType ?? "");
    out[key] = domainFromDb(kind, val);
  }
  return out;
}

export function convertRowToDb(
  table: PgTable,
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const cols = getTableColumns(table) as Record<string, ColMeta>;
  const row: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(parsed)) {
    const col = cols[key];
    if (!col) continue;
    const kind = classifyColumn(col.columnType);
    row[key] = dbFromDomain(kind, val);
  }
  return row;
}

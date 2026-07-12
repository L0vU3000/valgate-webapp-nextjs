"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type {
  ColumnConfig,
  ReviewRow,
  SelectOption,
  PropertyOption,
} from "@/lib/services/ingestion/types";

export type IngestionReviewProps = {
  columns: ColumnConfig[];
  initialRows: ReviewRow[];
  entityLabel: string;
  detectedSheet?: string | null;
  propertyOptions?: PropertyOption[];
  onCommit: (rows: ReviewRow[]) => Promise<void>;
  onCancel: () => void;
};

export function IngestionReview({
  columns,
  initialRows,
  entityLabel,
  detectedSheet,
  propertyOptions,
  onCommit,
  onCancel,
}: IngestionReviewProps) {
  const [rows, setRows] = useState<ReviewRow[]>(initialRows);
  const [importing, setImporting] = useState(false);

  function updateRow(index: number, field: string, value: string) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, values: { ...r.values, [field]: value } } : r,
      ),
    );
  }

  function liveIssues(row: ReviewRow): string[] {
    const issues = [...row.issues];
    for (const col of columns) {
      if (col.required) {
        const val = (row.values[col.field] ?? "").trim();
        if (!val) issues.push(`${col.label} is required`);
      }
      if (col.validate) {
        const val = (row.values[col.field] ?? "").trim();
        if (val) {
          const err = col.validate(val);
          if (err) issues.push(err);
        }
      }
    }
    return issues;
  }

  const blockedCount = useMemo(
    () => rows.filter((r) => liveIssues(r).length > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, columns],
  );
  const importable = rows.length - blockedCount;

  async function handleCommit() {
    const valid = rows.filter((r) => liveIssues(r).length === 0);
    if (valid.length === 0) return;
    setImporting(true);
    try {
      await onCommit(valid);
    } finally {
      setImporting(false);
    }
  }

  function resolveOptions(col: ColumnConfig): SelectOption[] {
    if (col.field === "propertyId" && propertyOptions) {
      return propertyOptions.map((p) => ({ value: p.id, label: p.label }));
    }
    return col.options ?? [];
  }

  return (
    <div>
      {detectedSheet && (
        <div className="mb-4 text-sm text-slate-600">
          Found {rows.length} {rows.length === 1 ? entityLabel : `${entityLabel}s`} in{" "}
          <span className="font-medium text-slate-900">{detectedSheet}</span>. Review and fix any
          flagged rows, then import.
        </div>
      )}

      {blockedCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {blockedCount} {blockedCount === 1 ? "row needs" : "rows need"} attention. Fix the
          highlighted fields — those rows may not be created.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {columns.map((col) => (
                <th key={col.field} className="px-3 py-2" style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const issues = liveIssues(row);
              const blocked = issues.length > 0;
              return (
                <tr key={i} className={blocked ? "bg-amber-50/40" : "odd:bg-white even:bg-slate-50/40"}>
                  {columns.map((col) => {
                    const value = row.values[col.field] ?? "";
                    const isMissing = col.required && !value.trim();
                    const selectOpts = resolveOptions(col);
                    const hasError =
                      isMissing ||
                      (col.validate && value.trim() && col.validate(value.trim()) !== null);

                    if (!col.editable) {
                      return (
                        <td key={col.field} className="px-3 py-2 text-slate-600">
                          {col.format ? col.format(row.values) : value || "—"}
                        </td>
                      );
                    }

                    const baseClass = `rounded-md border px-2 py-1 focus:outline-none ${
                      hasError
                        ? "border-amber-300 bg-amber-50"
                        : "border-slate-200 focus:border-blue-400"
                    }`;

                    if (col.control === "select") {
                      return (
                        <td key={col.field} className="px-3 py-2">
                          <select
                            value={value}
                            onChange={(e) => updateRow(i, col.field, e.target.value)}
                            className={baseClass}
                            style={col.width ? { width: col.width } : undefined}
                          >
                            <option value="">
                              {col.field === "propertyId" && row.rawProperty
                                ? `Unmatched: ${row.rawProperty}`
                                : "Select…"}
                            </option>
                            {selectOpts.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    }

                    return (
                      <td key={col.field} className="px-3 py-2">
                        <input
                          value={value}
                          onChange={(e) => updateRow(i, col.field, e.target.value)}
                          inputMode={col.control === "number" ? "decimal" : undefined}
                          placeholder={col.field === "rent" || col.field === "price" ? "0" : undefined}
                          className={baseClass}
                          style={col.width ? { width: col.width } : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCommit}
          disabled={importing || importable === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          Import {importable > 0 ? importable : ""}{" "}
          {importable === 1 ? entityLabel : `${entityLabel}s`}
        </button>
      </div>
    </div>
  );
}

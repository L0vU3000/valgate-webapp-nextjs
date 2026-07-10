"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { ValuationCandidate, PropertyOption, ValuationDraft } from "@/lib/services/valuation-import";
// The exact month shape the schema enforces — shared so the review gate and the server never disagree
// on which months are valid. A row whose month doesn't match is blocked before it reaches the schema.
import { MONTH_REGEX } from "@/lib/data/types/property-valuation";

// One editable review row (candidate fields the user can correct before import).
type Row = {
  propertyId: string;
  rawProperty: string;
  price: string; // kept as a string while editing; parsed to a number on import
  month: string; // 'MMM YYYY'; editable so a bad source date can be corrected
  recordedAt: number; // epoch ms from the source date; 0 when the date was unparseable
};

function toRow(c: ValuationCandidate): Row {
  return {
    propertyId: c.propertyId,
    rawProperty: c.rawProperty,
    price: c.price > 0 ? String(c.price) : "",
    month: c.month,
    recordedAt: c.recordedAt,
  };
}

// The numeric price a row currently holds. A minus sign is rejected (matches the server's parsePrice)
// so stripping non-digits can't turn "-50" into a positive 50.
function priceValue(raw: string): number {
  if (/-/.test(raw)) return 0;
  const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isNaN(value) || value <= 0 ? 0 : value;
}

// Per-row blocking problems, recomputed live as the user edits. A valuation must have a property, a
// positive price, and a valid 'MMM YYYY' month to be importable.
function rowIssues(row: Row): string[] {
  const issues: string[] = [];
  if (!row.propertyId) issues.push("Pick a property");
  if (priceValue(row.price) <= 0) issues.push("Add a valid price");
  if (!MONTH_REGEX.test(row.month.trim())) issues.push("Add a valid month (e.g. Jan 2026)");
  return issues;
}

export function ValuationReview({
  primarySheet,
  initialCandidates,
  properties,
  onImport,
  onCancel,
}: {
  primarySheet: string | null;
  initialCandidates: ValuationCandidate[];
  properties: PropertyOption[];
  onImport: (drafts: ValuationDraft[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => initialCandidates.map(toRow));
  const [importing, setImporting] = useState(false);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const blockedCount = useMemo(() => rows.filter((r) => rowIssues(r).length > 0).length, [rows]);
  const importable = rows.length - blockedCount;

  async function handleImport() {
    // Only send rows that are complete — blocked rows stay for the user to fix.
    const drafts: ValuationDraft[] = rows
      .filter((r) => rowIssues(r).length === 0)
      .map((r) => ({
        propertyId: r.propertyId,
        month: r.month.trim(),
        price: priceValue(r.price),
        recordedAt: r.recordedAt,
      }));
    if (drafts.length === 0) return;
    setImporting(true);
    try {
      await onImport(drafts);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {primarySheet ? (
            <>Found {rows.length} {rows.length === 1 ? "valuation" : "valuations"} in <span className="font-medium text-slate-900">{primarySheet}</span>. </>
          ) : (
            <>Found {rows.length} {rows.length === 1 ? "valuation" : "valuations"}. </>
          )}
          Review and fix any flagged rows, then import.
        </p>
        {blockedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {blockedCount} need attention
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">Month</th>
              <th className="px-3 py-2">Market value (USD)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const issues = rowIssues(row);
              const blocked = issues.length > 0;
              const badPrice = priceValue(row.price) <= 0;
              const badMonth = !MONTH_REGEX.test(row.month.trim());
              return (
                <tr key={i} className={blocked ? "bg-amber-50/40" : "odd:bg-white even:bg-slate-50/40"}>
                  <td className="px-3 py-2">
                    <select
                      value={row.propertyId}
                      onChange={(e) => update(i, { propertyId: e.target.value })}
                      className={`w-56 rounded-md border px-2 py-1 focus:outline-none ${row.propertyId ? "border-slate-200 focus:border-blue-400" : "border-amber-300 bg-amber-50"}`}
                    >
                      <option value="">
                        {row.rawProperty ? `Unmatched: ${row.rawProperty}` : "Select a property…"}
                      </option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.month}
                      onChange={(e) => update(i, { month: e.target.value })}
                      placeholder="Jan 2026"
                      title={badMonth ? "Enter the valuation month as 'MMM YYYY', e.g. Jan 2026" : undefined}
                      className={`w-28 rounded-md border px-2 py-1 focus:outline-none ${badMonth ? "border-amber-300 bg-amber-50" : "border-slate-200 focus:border-blue-400"}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.price}
                      onChange={(e) => update(i, { price: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                      title={badPrice ? "A valuation needs a positive amount — this row won't import until you set one" : undefined}
                      className={`w-32 rounded-md border px-2 py-1 focus:outline-none ${badPrice ? "border-amber-300 bg-amber-50" : "border-slate-200 focus:border-blue-400"}`}
                    />
                  </td>
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
          onClick={handleImport}
          disabled={importing || importable === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          Import {importable > 0 ? importable : ""} {importable === 1 ? "valuation" : "valuations"}
        </button>
      </div>
    </div>
  );
}

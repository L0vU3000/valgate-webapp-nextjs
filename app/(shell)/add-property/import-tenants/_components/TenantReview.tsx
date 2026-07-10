"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { TenantCandidate, PropertyOption, TenantDraft } from "@/lib/services/tenant-import";
import type { TenantStatus } from "@/lib/data/types/tenant";

const STATUS_OPTIONS: TenantStatus[] = ["Paid", "Overdue", "Pending"];

// One editable review row (candidate fields the user can correct before import).
type Row = {
  name: string;
  unit: string;
  rent: string; // kept as a string while editing; parsed to a number on import
  status: TenantStatus;
  propertyId: string;
  rawProperty: string;
  email: string;
  phone: string;
};

function toRow(c: TenantCandidate): Row {
  return {
    name: c.name,
    unit: c.unit,
    rent: c.rent ? String(c.rent) : "",
    status: c.status,
    propertyId: c.propertyId,
    rawProperty: c.rawProperty,
    email: c.email,
    phone: c.phone,
  };
}

// Per-row blocking problems, recomputed live as the user edits. A row must have a
// name and a chosen property to be importable.
function rowIssues(row: Row): string[] {
  const issues: string[] = [];
  if (!row.name.trim()) issues.push("Add a name");
  if (!row.propertyId) issues.push("Pick a property");
  return issues;
}

export function TenantReview({
  primarySheet,
  initialCandidates,
  properties,
  onImport,
  onCancel,
}: {
  primarySheet: string | null;
  initialCandidates: TenantCandidate[];
  properties: PropertyOption[];
  onImport: (drafts: TenantDraft[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => initialCandidates.map(toRow));
  const [importing, setImporting] = useState(false);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const blockedCount = useMemo(() => rows.filter((r) => rowIssues(r).length > 0).length, [rows]);
  const importable = rows.length - blockedCount;
  // Rows the AI couldn't find a rent for — importable, but defaulted to 0, so we surface them
  // (the "default + flag" contract) without blocking the import.
  const missingRentCount = useMemo(() => rows.filter((r) => !r.rent.trim()).length, [rows]);

  async function handleImport() {
    // Only send rows that are complete — blocked rows stay for the user to fix.
    const drafts: TenantDraft[] = rows
      .filter((r) => rowIssues(r).length === 0)
      .map((r) => ({
        name: r.name.trim(),
        unit: r.unit.trim(),
        // A minus sign means a negative/credit figure — reject it (matches the server's parseRent),
        // since stripping non-digits would otherwise turn "-50" into a positive 50.
        rent: /-/.test(r.rent) ? 0 : Number.parseFloat(r.rent.replace(/[^0-9.]/g, "")) || 0,
        status: r.status,
        propertyId: r.propertyId,
        email: r.email.trim(),
        phone: r.phone.trim(),
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
            <>Found {rows.length} {rows.length === 1 ? "tenant" : "tenants"} in <span className="font-medium text-slate-900">{primarySheet}</span>. </>
          ) : (
            <>Found {rows.length} {rows.length === 1 ? "tenant" : "tenants"}. </>
          )}
          Review and fix any flagged rows, then import.
          {missingRentCount > 0 && (
            <span className="text-amber-700"> {missingRentCount} {missingRentCount === 1 ? "row has" : "rows have"} no rent in the file (will import as 0).</span>
          )}
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
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Rent (USD)</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const issues = rowIssues(row);
              const blocked = issues.length > 0;
              return (
                <tr key={i} className={blocked ? "bg-amber-50/40" : "odd:bg-white even:bg-slate-50/40"}>
                  <td className="px-3 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="Full name"
                      className="w-40 rounded-md border border-slate-200 px-2 py-1 focus:border-blue-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.propertyId}
                      onChange={(e) => update(i, { propertyId: e.target.value })}
                      className={`w-44 rounded-md border px-2 py-1 focus:outline-none ${row.propertyId ? "border-slate-200 focus:border-blue-400" : "border-amber-300 bg-amber-50"}`}
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
                      value={row.unit}
                      onChange={(e) => update(i, { unit: e.target.value })}
                      placeholder="—"
                      className="w-24 rounded-md border border-slate-200 px-2 py-1 focus:border-blue-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.rent}
                      onChange={(e) => update(i, { rent: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                      title={row.rent.trim() ? undefined : "No rent found in the file — will import as 0 unless you set it"}
                      className={`w-24 rounded-md border px-2 py-1 focus:outline-none ${row.rent.trim() ? "border-slate-200 focus:border-blue-400" : "border-amber-300 bg-amber-50"}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.status}
                      onChange={(e) => update(i, { status: e.target.value as TenantStatus })}
                      className="rounded-md border border-slate-200 px-2 py-1 focus:border-blue-400 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.email}
                      onChange={(e) => update(i, { email: e.target.value })}
                      placeholder="—"
                      className="w-44 rounded-md border border-slate-200 px-2 py-1 focus:border-blue-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.phone}
                      onChange={(e) => update(i, { phone: e.target.value })}
                      placeholder="—"
                      className="w-32 rounded-md border border-slate-200 px-2 py-1 focus:border-blue-400 focus:outline-none"
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
          Import {importable > 0 ? importable : ""} {importable === 1 ? "tenant" : "tenants"}
        </button>
      </div>
    </div>
  );
}

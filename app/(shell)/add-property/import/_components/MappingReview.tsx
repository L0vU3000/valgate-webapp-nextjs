"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, MapPin } from "lucide-react";
import type { ColumnMapping, MappableField } from "@/lib/services/property-import";
import type { FormData as WizardForm } from "@/app/_shared/add-property/types";

const FIELD_LABELS: Record<MappableField, string> = {
  propertyName: "Name",
  propertyType: "Type",
  status: "Status",
  addressLine: "Address",
  addressLine2: "Address line 2",
  city: "City",
  province: "Province",
  zip: "ZIP",
  country: "Country",
  yearBuilt: "Year built",
  totalArea: "Total area",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  parkingSpaces: "Parking",
  storageUnit: "Storage",
  purchasePrice: "Purchase price",
  purchaseDate: "Purchase date",
  currentMarketValue: "Market value",
  outstandingMortgage: "Mortgage",
  monthlyPayment: "Monthly payment",
  interestRate: "Interest rate",
  annualPropertyTax: "Property tax",
  taxAssessmentValue: "Tax assessment",
  annualInsurance: "Insurance",
  ownershipStatus: "Ownership",
};

const TYPE_OPTIONS = [
  "residential", "commercial", "multi-unit", "retail", "land", "industrial", "construction", "other",
];
const STATUS_OPTIONS: WizardForm["status"][] = ["", "Rented", "Vacant", "Owner-Occupied"];

type Row = { form: WizardForm; needsLocation: boolean };

function rowIssues(form: WizardForm): string[] {
  const issues: string[] = [];
  if (!form.propertyName.trim()) issues.push("Missing name");
  if (!form.propertyType) issues.push("Missing type");
  return issues;
}

export function MappingReview({
  mapping,
  initialCandidates,
  onImport,
  onCancel,
}: {
  mapping: ColumnMapping;
  initialCandidates: Row[];
  onImport: (forms: WizardForm[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(initialCandidates);
  const [importing, setImporting] = useState(false);

  const matched = useMemo(
    () => (Object.keys(mapping) as MappableField[]).filter((f) => mapping[f]),
    [mapping],
  );

  const problemCount = rows.filter((r) => rowIssues(r.form).length > 0).length;

  function updateRow(index: number, patch: Partial<WizardForm>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, form: { ...r.form, ...patch } } : r)));
  }

  async function handleImport() {
    setImporting(true);
    try {
      await onImport(rows.map((r) => r.form));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      {/* AI column match summary */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          We matched {matched.length} of your columns
        </p>
        {matched.length === 0 ? (
          <p className="text-sm text-amber-700">
            We couldn&apos;t auto-match any columns. Edit the fields below directly before importing.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {matched.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
              >
                <span className="font-medium text-slate-800">{FIELD_LABELS[f]}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span className="text-slate-500">{mapping[f]}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {problemCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {problemCount} {problemCount === 1 ? "row needs" : "rows need"} attention. Fix the highlighted
          fields — those rows may not be created.
        </div>
      )}

      {/* Candidate table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5 w-8">#</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">City</th>
              <th className="px-3 py-2.5">Price</th>
              <th className="px-3 py-2.5">Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const issues = rowIssues(r.form);
              return (
                <tr key={i} className={`border-b border-slate-100 ${issues.length ? "bg-amber-50/40" : ""}`}>
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      value={r.form.propertyName}
                      onChange={(e) => updateRow(i, { propertyName: e.target.value })}
                      placeholder="Required"
                      className={`w-40 rounded border px-2 py-1 text-sm ${
                        r.form.propertyName.trim() ? "border-slate-200" : "border-rose-300 bg-rose-50"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.form.propertyType}
                      onChange={(e) => updateRow(i, { propertyType: e.target.value })}
                      className={`rounded border px-2 py-1 text-sm ${
                        r.form.propertyType ? "border-slate-200" : "border-rose-300 bg-rose-50"
                      }`}
                    >
                      <option value="">—</option>
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.form.status}
                      onChange={(e) => updateRow(i, { status: e.target.value as WizardForm["status"] })}
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s || "—"}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={r.form.city}
                      onChange={(e) => updateRow(i, { city: e.target.value })}
                      className="w-32 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.form.purchasePrice || r.form.currentMarketValue || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.needsLocation ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                        <MapPin className="h-3 w-3" /> Needs location
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        <MapPin className="h-3 w-3" /> Located
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Rows marked &ldquo;Needs location&rdquo; will still import — they use a default map center you can adjust
        on the property later.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleImport}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          {importing ? "Importing…" : `Import ${rows.length} ${rows.length === 1 ? "property" : "properties"}`}
        </button>
        <button
          onClick={onCancel}
          disabled={importing}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileSpreadsheet, Loader2, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { parseWorkbook, SpreadsheetError, MAX_IMPORT_ROWS } from "@/app/_shared/add-property/_lib/parse-spreadsheet";
import { extractAllAction, bulkCreateAction, type ExtractResult } from "@/app/actions/unified-extract";
import type { SheetMatrix } from "@/app/_shared/add-property/_lib/parse-spreadsheet";
import type { EntityType, ReviewRow, PropertyOption, BulkResult } from "@/lib/services/ingestion/types";
import { IngestionReview } from "@/app/_shared/ingestion/IngestionReview";
import { allColumnConfigs } from "@/app/_shared/ingestion/column-configs";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const TAB_GROUPS: { label: string; types: EntityType[] }[] = [
  { label: "Portfolio", types: ["properties", "landParcels", "coOwners"] },
  { label: "Rental", types: ["tenants", "leases", "payments"] },
  { label: "Financial", types: ["valuations", "expenses"] },
  { label: "Compliance", types: ["inspections", "certifications", "safetyRisks", "emergencyContacts"] },
  { label: "Estate", types: ["successors"] },
];

const ENTITY_LABEL: Record<EntityType, string> = {
  properties: "property", tenants: "tenant", valuations: "valuation", leases: "lease",
  payments: "payment", expenses: "expense", coOwners: "co-owner", maintenance: "maintenance item",
  inspections: "inspection", certifications: "certification", safetyRisks: "safety risk",
  emergencyContacts: "emergency contact", successors: "successor", landParcels: "land parcel",
};

const COMMIT_ORDER: EntityType[] = [
  "properties", "landParcels", "coOwners", "tenants", "leases", "payments",
  "valuations", "expenses", "maintenance", "inspections", "certifications",
  "safetyRisks", "emergencyContacts", "successors",
];

type Stage = "upload" | "extracting" | "review" | "done";
type TabStatus = "ready" | "committed";

export function ImportFlow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [perEntityRows, setPerEntityRows] = useState<Partial<Record<EntityType, ReviewRow[]>>>({});
  const [tabStatus, setTabStatus] = useState<Partial<Record<EntityType, TabStatus>>>({});
  const [tabResults, setTabResults] = useState<Partial<Record<EntityType, BulkResult>>>({});
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [activeTab, setActiveTab] = useState<EntityType | null>(null);
  const [importingAll, setImportingAll] = useState(false);

  const detectedTypes = Object.keys(perEntityRows).filter(
    (k) => perEntityRows[k as EntityType] && perEntityRows[k as EntityType]!.length > 0,
  ) as EntityType[];

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("File too large. Maximum size is 20 MB.");
      return;
    }

    let sheets: SheetMatrix[];
    try {
      sheets = await parseWorkbook(file);
    } catch (err) {
      setError(err instanceof SpreadsheetError ? err.message : "Could not read that file.");
      return;
    }

    setStage("extracting");

    const res = await extractAllAction(sheets);
    if (!res.ok) {
      setError(res.error);
      setStage("upload");
      return;
    }

    const data: ExtractResult = res.data;
    setProperties(data.properties);

    const rows: Partial<Record<EntityType, ReviewRow[]>> = {};
    const status: Partial<Record<EntityType, TabStatus>> = {};
    for (const type of Object.keys(data.rows) as EntityType[]) {
      const arr = data.rows[type];
      if (arr && arr.length > 0) {
        rows[type] = arr;
        status[type] = "ready";
      }
    }

    setPerEntityRows(rows);
    setTabStatus(status);
    setTabResults({});

    if (Object.keys(status).length === 0) {
      setError("Couldn't find any properties, tenants, valuations, or other records in that file.");
      setStage("upload");
      return;
    }

    setActiveTab(Object.keys(status)[0] as EntityType);
    setStage("review");
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  async function handleCommitTab(type: EntityType, rows: ReviewRow[]) {
    const res = await bulkCreateAction(type, rows);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setTabStatus((prev) => ({ ...prev, [type]: "committed" }));
    setTabResults((prev) => ({ ...prev, [type]: res.data }));
    return true;
  }

  async function handleImportEverything() {
    setImportingAll(true);
    for (const type of COMMIT_ORDER) {
      if (tabStatus[type] !== "ready") continue;
      const rows = perEntityRows[type];
      if (!rows) continue;
      await handleCommitTab(type, rows);
    }
    setImportingAll(false);
    setStage("done");
  }

  function reset() {
    setStage("upload");
    setPerEntityRows({});
    setTabStatus({});
    setTabResults({});
    setProperties([]);
    setActiveTab(null);
    setError(null);
  }

  const allCommitted = detectedTypes.length > 0 && detectedTypes.every((t) => tabStatus[t] === "committed");
  const anyReady = detectedTypes.some((t) => tabStatus[t] === "ready");
  const multipleTabs = detectedTypes.length > 1;

  // Group tabs
  const visibleGroups = TAB_GROUPS.map((g) => ({
    ...g,
    types: g.types.filter((t) => detectedTypes.includes(t)),
  })).filter((g) => g.types.length > 0);

  const tabLabel = (type: EntityType): string => {
    const base = type === "coOwners" ? "Co-owners" : type === "emergencyContacts" ? "Emergency Contacts"
      : type === "safetyRisks" ? "Safety Risks" : type === "landParcels" ? "Land Parcels"
      : type === "maintenance" ? "Maintenance" : ENTITY_LABEL[type].charAt(0).toUpperCase() + ENTITY_LABEL[type].slice(1) + "s";
    const count = perEntityRows[type]?.length ?? 0;
    const status = tabStatus[type];
    if (status === "committed") return `${base} ✓`;
    return `${base} (${count})`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <AppHeader />
      <div className="flex-1 overflow-auto px-4 sm:px-8 py-6">
        <div className="max-w-[1100px] mx-auto">
          <button
            onClick={() => router.push("/add-property")}
            className="flex items-center gap-1 mb-6 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-slate-900 leading-tight mb-1">Import from spreadsheet</h1>
            <p className="text-sm text-slate-500">
              Upload a CSV or Excel file. Valgate AI reads every sheet, detects all entity types, and
              lets you review everything before creating — one upload, one pass.
            </p>
          </div>

          {stage === "upload" && (
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFile(file);
                }}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center cursor-pointer transition-colors ${
                  dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <UploadCloud className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-[15px] font-semibold text-slate-900">Drop your spreadsheet here, or click to browse</div>
                <div className="text-sm text-slate-500">CSV or Excel (.xlsx) · up to {MAX_IMPORT_ROWS} rows per entity · max 20 MB</div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={onInputChange} />
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  Any column names are fine — AI matches them to Valgate&apos;s fields. Your workbook can
                  contain properties, tenants, leases, payments, expenses, valuations, co-owners,
                  maintenance, inspections, certifications, and more. We detect what&apos;s there.
                </span>
              </div>
              {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            </div>
          )}

          {stage === "extracting" && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm">Reading your workbook and extracting all entities…</p>
            </div>
          )}

          {stage === "review" && activeTab && (
            <div>
              {/* Grouped tab bar */}
              {multipleTabs ? (
                <div className="mb-6 flex flex-wrap gap-4 border-b border-slate-200 pb-2">
                  {visibleGroups.map((group) => (
                    <div key={group.label} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{group.label}</span>
                      <div className="flex gap-1">
                        {group.types.map((type) => (
                          <button
                            key={type}
                            onClick={() => setActiveTab(type)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              activeTab === type
                                ? "bg-blue-50 text-blue-600"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {tabLabel(type)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 text-sm text-slate-600">
                  Found {perEntityRows[activeTab]?.length ?? 0} {ENTITY_LABEL[activeTab]}(s). Review and import.
                </div>
              )}

              {/* Active tab content */}
              {detectedTypes.map((type) => {
                if (activeTab !== type) return null;
                const rows = perEntityRows[type];
                if (!rows) return null;
                const status = tabStatus[type];
                const result = tabResults[type];

                if (status === "committed" && result) {
                  return (
                    <div key={type} className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-lg font-semibold text-slate-900">
                          {result.created > 0
                            ? `Imported ${result.created} ${result.created === 1 ? ENTITY_LABEL[type] : ENTITY_LABEL[type] + "s"}`
                            : `No ${ENTITY_LABEL[type]}s were imported`}
                        </h2>
                      </div>
                      {result.failures.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-slate-600">
                            {result.failures.length} {result.failures.length === 1 ? "row" : "rows"} couldn&apos;t be created:
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-rose-600">
                            {result.failures.map((f, i) => (
                              <li key={i}>• {f.name}: {f.reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={type}>
                    <IngestionReview
                      columns={allColumnConfigs[type]}
                      initialRows={rows}
                      entityLabel={ENTITY_LABEL[type]}
                      propertyOptions={type !== "properties" && type !== "successors" ? properties : undefined}
                      onCommit={async (committedRows) => {
                        const success = await handleCommitTab(type, committedRows);
                        if (success) toast.success(`Imported ${ENTITY_LABEL[type]}s`);
                      }}
                      onCancel={reset}
                    />

                    {multipleTabs && anyReady && !allCommitted && (
                      <div className="mt-6 border-t border-slate-200 pt-6">
                        <button
                          onClick={handleImportEverything}
                          disabled={importingAll}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                        >
                          {importingAll && <Loader2 className="h-4 w-4 animate-spin" />}
                          {importingAll ? "Importing everything…" : "Import everything"}
                        </button>
                        <p className="mt-2 text-xs text-slate-400">
                          Commits all ready tabs in order: properties → co-owners → tenants → leases →
                          payments → valuations → expenses → maintenance → inspections → certifications →
                          safety risks → contacts → successors.
                        </p>
                      </div>
                    )}

                    {allCommitted && (
                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={() => router.push("/portfolio")}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          View portfolio
                        </button>
                        <button
                          onClick={reset}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Import another file
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {stage === "done" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Import summary</h2>
              {detectedTypes.map((type) => {
                const result = tabResults[type];
                if (!result) return null;
                const label = type === "coOwners" ? "Co-owners" : ENTITY_LABEL[type].charAt(0).toUpperCase() + ENTITY_LABEL[type].slice(1) + "s";
                return (
                  <div key={type} className="mb-3 last:mb-0">
                    <p className="text-sm font-medium text-slate-900">
                      {label}: {result.created > 0 ? `${result.created} imported` : "none imported"}
                    </p>
                    {result.failures.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-sm text-rose-600">
                        {result.failures.map((f, i) => (
                          <li key={i}>• {f.name || `Row ${f.row}`}: {f.reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => router.push("/portfolio")}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  View portfolio
                </button>
                <button
                  onClick={reset}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Import another file
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { parseWorkbook, SpreadsheetError, MAX_IMPORT_ROWS } from "@/app/_shared/add-property/_lib/parse-spreadsheet";
import { extractRows, findHeaderRow } from "@/app/_shared/add-property/_lib/extract-rows";
import { mapValuationsAction, bulkCreateValuationsAction } from "@/app/actions/valuation-import";
import type { SheetData } from "@/lib/services/entity-import";
import type { ValuationCandidate, PropertyOption, ValuationDraft } from "@/lib/services/valuation-import";
import { ValuationReview } from "./ValuationReview";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

type Stage = "upload" | "mapping" | "review" | "done";
type DoneState = { created: number; failures: { row: number; label: string; reason: string }[] };

export function ValuationImportFlow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [candidates, setCandidates] = useState<ValuationCandidate[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [primarySheet, setPrimarySheet] = useState<string | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("File too large. Maximum size is 20 MB.");
      return;
    }

    // 1. Parse EVERY sheet to a raw matrix — the field-first engine reads across the whole workbook.
    let sheets;
    try {
      sheets = await parseWorkbook(file);
    } catch (err) {
      setError(err instanceof SpreadsheetError ? err.message : "Could not read that file.");
      return;
    }

    // 2. Slice each sheet at its header row into header-keyed rows. Drop sheets with no usable header
    //    or no data.
    const sheetData: SheetData[] = sheets
      .map((s) => {
        const { headers, rows } = extractRows(s.matrix, findHeaderRow(s.matrix));
        return { name: s.name, headers, rows };
      })
      .filter((s) => s.headers.length > 0 && s.rows.length > 0);

    if (sheetData.length === 0) {
      setError("Couldn't find any data rows in that file. Check the file and try again.");
      return;
    }

    setStage("mapping");

    // 3. The AI sources the valuation fields across the whole workbook; we get back reviewable
    //    candidates + the org's property list for the picker.
    const res = await mapValuationsAction(sheetData);
    if (!res.ok) {
      setError(res.error);
      setStage("upload");
      return;
    }
    if (res.data.candidates.length === 0) {
      setError("Couldn't identify any valuations in that workbook. Make sure it has a valuation history.");
      setStage("upload");
      return;
    }
    if (res.data.candidates.length > MAX_IMPORT_ROWS) {
      setError(`That workbook has ${res.data.candidates.length} valuations. Import supports up to ${MAX_IMPORT_ROWS} at a time.`);
      setStage("upload");
      return;
    }

    setCandidates(res.data.candidates);
    setProperties(res.data.properties);
    setPrimarySheet(res.data.primarySheet);
    setStage("review");
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  async function handleImport(drafts: ValuationDraft[]) {
    const res = await bulkCreateValuationsAction(drafts);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDone(res.data);
    setStage("done");
  }

  function reset() {
    setStage("upload");
    setCandidates([]);
    setProperties([]);
    setPrimarySheet(null);
    setDone(null);
    setError(null);
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <AppHeader />
      <div className="flex-1 overflow-auto px-4 sm:px-8 py-6">
        <div className="max-w-[1000px] mx-auto">
          <button
            onClick={() => router.push("/add-property")}
            className="flex items-center gap-1 mb-6 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-slate-900 leading-tight mb-1">Import valuations from spreadsheet</h1>
            <p className="text-sm text-slate-500">
              Upload a client workbook. We&apos;ll read across all its sheets, match each valuation to a
              property, and you review before anything is created.
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
                <div className="text-[15px] font-semibold text-slate-900">Drop your workbook here, or click to browse</div>
                <div className="text-sm text-slate-500">CSV or Excel (.xlsx) · up to {MAX_IMPORT_ROWS} valuations · max 20 MB</div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={onInputChange} />
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  A property can have many valuations over time. An AI reads across every sheet, links
                  each valuation to a property, and reads its date and market value.
                </span>
              </div>
              {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            </div>
          )}

          {stage === "mapping" && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm">Reading your workbook and matching valuations to properties…</p>
            </div>
          )}

          {stage === "review" && (
            <ValuationReview
              primarySheet={primarySheet}
              initialCandidates={candidates}
              properties={properties}
              onImport={handleImport}
              onCancel={reset}
            />
          )}

          {stage === "done" && done && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {done.created > 0 ? `Imported ${done.created} ${done.created === 1 ? "valuation" : "valuations"}` : "Nothing was imported"}
              </h2>
              {done.failures.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600">
                    {done.failures.length} {done.failures.length === 1 ? "row" : "rows"} couldn&apos;t be created:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-rose-600">
                    {done.failures.map((f) => (
                      <li key={f.row}>• {f.label}: {f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
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

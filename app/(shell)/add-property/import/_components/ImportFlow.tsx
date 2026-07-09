"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { parseWorkbook, SpreadsheetError, MAX_IMPORT_ROWS } from "@/app/_shared/add-property/_lib/parse-spreadsheet";
import { extractRows, findHeaderRow } from "@/app/_shared/add-property/_lib/extract-rows";
import { detectLayoutAction, mapSpreadsheetAction, bulkCreatePropertiesAction } from "@/app/actions/property-import";
import type { ColumnMapping } from "@/lib/services/property-import";
import type { FormData as WizardForm } from "@/app/_shared/add-property/types";
import { MappingReview } from "./MappingReview";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

type Stage = "upload" | "mapping" | "review" | "done";

type DoneState = { created: number; failures: { row: number; name: string; reason: string }[] };

export function ImportFlow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [candidates, setCandidates] = useState<{ form: WizardForm; needsLocation: boolean }[]>([]);
  const [detectedSheet, setDetectedSheet] = useState<string | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("File too large. Maximum size is 20 MB.");
      return;
    }

    // 1. Parse every sheet to a raw matrix (header position unknown).
    let sheets;
    try {
      sheets = await parseWorkbook(file);
    } catch (err) {
      setError(err instanceof SpreadsheetError ? err.message : "Could not read that file.");
      return;
    }

    setStage("mapping");

    // 2. Ask the AI which sheet holds the properties and where its header row is. Fall back to the
    //    first sheet / row 0 if detection is unavailable.
    const previews = sheets.map((s) => ({ name: s.name, rows: s.matrix.slice(0, 8) }));
    const layoutRes = await detectLayoutAction(previews);
    if (!layoutRes.ok) {
      setError(layoutRes.error);
      setStage("upload");
      return;
    }
    const sheetName = layoutRes.data?.sheetName ?? sheets[0]!.name;
    const chosen = sheets.find((s) => s.name === sheetName) ?? sheets[0]!;

    // 3. Find the header row (code heuristic — the fullest row with data below it) and slice the sheet
    //    from there into header-keyed rows.
    const { headers, rows } = extractRows(chosen.matrix, findHeaderRow(chosen.matrix));
    if (rows.length === 0) {
      setError(`Found the "${chosen.name}" sheet but no property rows in it. Check the file and try again.`);
      setStage("upload");
      return;
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      setError(`The "${chosen.name}" sheet has ${rows.length} rows. Bulk import supports up to ${MAX_IMPORT_ROWS} at a time — please split it and try again.`);
      setStage("upload");
      return;
    }

    // 4. Map columns → candidate properties (unchanged).
    const res = await mapSpreadsheetAction(headers, rows);
    if (!res.ok) {
      setError(res.error);
      setStage("upload");
      return;
    }
    setDetectedSheet(chosen.name);
    setMapping(res.data.mapping);
    setCandidates(res.data.candidates.map((c) => ({ form: c.form, needsLocation: c.needsLocation })));
    setStage("review");
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  async function handleImport(forms: WizardForm[]) {
    const res = await bulkCreatePropertiesAction(forms);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDone(res.data);
    setStage("done");
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
            <h1 className="text-[28px] font-bold text-slate-900 leading-tight mb-1">Import from spreadsheet</h1>
            <p className="text-sm text-slate-500">
              Upload a CSV or Excel file of your properties. We&apos;ll match your columns to Valgate&apos;s
              fields, clean up the values, and you review before anything is created.
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
                <div className="text-sm text-slate-500">CSV or Excel (.xlsx) · up to {MAX_IMPORT_ROWS} properties · max 20 MB</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={onInputChange}
              />
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  One row per property. Any column names are fine — an AI matches them to Valgate&apos;s fields.
                  Handy columns: property name, type, address, city, purchase price, market value, bedrooms.
                </span>
              </div>
              {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            </div>
          )}

          {stage === "mapping" && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm">Finding your properties and matching columns to Valgate&apos;s fields…</p>
            </div>
          )}

          {stage === "review" && mapping && (
            <MappingReview
              mapping={mapping}
              detectedSheet={detectedSheet}
              initialCandidates={candidates}
              onImport={handleImport}
              onCancel={() => { setStage("upload"); setMapping(null); setCandidates([]); setDetectedSheet(null); }}
            />
          )}

          {stage === "done" && done && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {done.created > 0 ? `Imported ${done.created} ${done.created === 1 ? "property" : "properties"}` : "Nothing was imported"}
              </h2>
              {done.failures.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600">
                    {done.failures.length} {done.failures.length === 1 ? "row" : "rows"} couldn&apos;t be created:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-rose-600">
                    {done.failures.map((f) => (
                      <li key={f.row}>• {f.name}: {f.reason}</li>
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
                  onClick={() => { setStage("upload"); setDone(null); setMapping(null); setCandidates([]); setDetectedSheet(null); setError(null); }}
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

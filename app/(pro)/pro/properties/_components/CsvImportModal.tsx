"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import Papa from "papaparse";
import { cn } from "@/components/ui/utils";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalActions,
  proSelectClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import { importCsvProperties } from "@/app/(pro)/pro/properties.actions";

type ClientOption = { id: string; name: string };
type CsvRow = Record<string, string>;
type Stage = "upload-map" | "review" | "done";
type ChipFilter = "all" | "import" | "skip";

const PROPERTY_FIELDS = [
  { value: "name", label: "Name *" },
  { value: "type", label: "Type" },
  { value: "status", label: "Status" },
  { value: "totalArea", label: "Total Area" },
  { value: "title", label: "Title" },
  { value: "buyNumeric", label: "Purchase Price" },
  { value: "lat", label: "Latitude" },
  { value: "lng", label: "Longitude" },
  { value: "addressLine", label: "Address" },
  { value: "city", label: "City" },
  { value: "zip", label: "ZIP / Postcode" },
  { value: "country", label: "Country" },
  { value: "province", label: "Province / State" },
  { value: "yearBuilt", label: "Year Built" },
  { value: "bedrooms", label: "Bedrooms" },
  { value: "bathrooms", label: "Bathrooms" },
  { value: "parkingSpaces", label: "Parking Spaces" },
  { value: "purchasePrice", label: "Purchase Price (string)" },
  { value: "currentMarketValue", label: "Market Value" },
  { value: "__skip__", label: "Skip" },
];

const TEMPLATE_HEADERS = [
  "Name", "Type", "Status", "Total Area", "Title",
  "Purchase Price", "Latitude", "Longitude", "Address",
  "City", "ZIP", "Country", "Province",
  "Year Built", "Bedrooms", "Bathrooms", "Parking Spaces", "Market Value",
];

function autoMapColumn(col: string): string {
  const lower = col.toLowerCase().trim();
  if (["name", "property name", "property_name"].includes(lower)) return "name";
  if (["type", "property type"].includes(lower)) return "type";
  if (["status", "property status"].includes(lower)) return "status";
  if (["total area", "total_area", "area"].includes(lower)) return "totalArea";
  if (["title", "property title"].includes(lower)) return "title";
  if (["purchase price", "purchase_price", "buy", "buy_numeric", "buy numeric", "buy price"].includes(lower)) return "buyNumeric";
  if (["lat", "latitude"].includes(lower)) return "lat";
  if (["lng", "longitude", "lon"].includes(lower)) return "lng";
  if (["address", "address line", "address_line", "addressline"].includes(lower)) return "addressLine";
  if (["city"].includes(lower)) return "city";
  if (["zip", "postcode", "zip code"].includes(lower)) return "zip";
  if (["country"].includes(lower)) return "country";
  if (["province", "state", "province / state"].includes(lower)) return "province";
  if (["year built", "year_built", "yearbuilt"].includes(lower)) return "yearBuilt";
  if (["bedrooms", "beds", "bedroom"].includes(lower)) return "bedrooms";
  if (["bathrooms", "baths", "bathroom"].includes(lower)) return "bathrooms";
  if (["parking", "parking spaces", "parking_spaces", "parkingspaces"].includes(lower)) return "parkingSpaces";
  if (["market value", "market_value", "currentmarketvalue", "current market value"].includes(lower)) return "currentMarketValue";
  return "__skip__";
}

// A chip pill used in the review filter bar and the done report. Shared style.
function Chip({
  label,
  active,
  onClick,
  variant = "neutral",
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  variant?: "neutral" | "success" | "warn";
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors";
  const colors = {
    neutral: active
      ? "bg-slate-800 text-white"
      : "bg-slate-100 text-slate-500 hover:bg-slate-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border border-amber-200",
  };
  return (
    <button type="button" onClick={onClick} className={cn(base, colors[variant])}>
      {label}
    </button>
  );
}

export function CsvImportModal({
  open,
  onOpenChange,
  clients,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  onComplete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload-map");
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [chip, setChip] = useState<ChipFilter>("all");
  const [createAnyway, setCreateAnyway] = useState(false);
  const [importResult, setImportResult] = useState<{
    count: number;
    skipped: Array<{ row: number; reason: string }>;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedClient = clients.find((c) => c.id === clientId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }
        if (results.data.length === 0) { setError("CSV file is empty."); return; }
        const cols = results.meta.fields ?? [];
        setColumns(cols);
        setRows(results.data as CsvRow[]);
        const autoMap: Record<string, string> = {};
        for (const col of cols) autoMap[col] = autoMapColumn(col);
        setColumnMap(autoMap);
        setError(null);
      },
    });
  }

  function mapRowToProperty(row: CsvRow): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const csvCol of columns) {
      const field = columnMap[csvCol];
      if (!field || field === "__skip__") continue;
      mapped[field] = row[csvCol];
    }
    return mapped;
  }

  // All CSV rows mapped to the property shape. Valid = has a name.
  const mappedRows = useMemo(() => {
    return rows.map((row, i) => {
      const raw = mapRowToProperty(row);
      const name = ((raw.name as string) ?? "").trim();
      return {
        index: i + 1,
        name,
        type: (raw.type as string) ?? "residential",
        status: (raw.status as string) ?? "Vacant",
        city: (raw.city as string) ?? "",
        valid: name.length > 0,
        // The full payload sent to the server
        payload: {
          name,
          type: ((raw.type as string) ?? "residential").toLowerCase(),
          status: (raw.status as string) ?? "Vacant",
          totalArea: (raw.totalArea as string) ?? "0",
          title: (raw.title as string) ?? "—",
          buyNumeric: Number(raw.buyNumeric ?? 0),
          lat: Number(raw.lat ?? 0),
          lng: Number(raw.lng ?? 0),
          addressLine: (raw.addressLine as string) ?? "",
          city: (raw.city as string) ?? "",
          zip: (raw.zip as string) ?? "",
          country: (raw.country as string) ?? "",
          province: (raw.province as string) ?? "",
          yearBuilt: (raw.yearBuilt as string) ?? "",
          bedrooms: (raw.bedrooms as string) ?? "",
          bathrooms: (raw.bathrooms as string) ?? "",
          parkingSpaces: (raw.parkingSpaces as string) ?? "",
          purchasePrice: (raw.purchasePrice as string) ?? "",
          currentMarketValue: Number(raw.currentMarketValue ?? 0),
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, columnMap]);

  const validRows = mappedRows.filter((r) => r.valid);
  const invalidRows = mappedRows.filter((r) => !r.valid);

  const reviewRows =
    chip === "import" ? validRows
    : chip === "skip" ? invalidRows
    : mappedRows;

  const usedFields = useMemo(
    () => new Set(Object.values(columnMap).filter((v) => v !== "__skip__")),
    [columnMap],
  );

  function handleContinueToReview(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError("Please select a client."); return; }
    if (rows.length === 0) { setError("No CSV data to import."); return; }
    setError(null);
    setChip("all");
    setCreateAnyway(false);
    setStage("review");
  }

  function handleImport() {
    if (validRows.length === 0) return;
    startTransition(async () => {
      const result = await importCsvProperties({
        clientId,
        rows: validRows.map((r) => r.payload),
        createAnyway,
      });
      if (!result.ok) { setError(result.error); return; }
      setImportResult({
        count: result.count ?? validRows.length,
        skipped: result.skipped ?? [],
      });
      setStage("done");
    });
  }

  function handleClose() {
    if (isPending) return;
    setStage("upload-map");
    setRows([]);
    setColumns([]);
    setColumnMap({});
    setClientId("");
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  }

  function handleDone() {
    handleClose();
    onComplete();
  }

  function handleDownloadTemplate() {
    const csv = Papa.unparse([TEMPLATE_HEADERS]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "property-import-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <ProModal
      open={open}
      onOpenChange={(o) => { if (!o) handleClose(); }}
      title={
        stage === "review"
          ? `Review ${mappedRows.length} ${mappedRows.length === 1 ? "property" : "properties"}`
          : stage === "done"
            ? "Import complete"
            : "Import properties from CSV"
      }
      description={
        stage === "review"
          ? selectedClient ? `Importing to ${selectedClient.name}` : undefined
          : stage === "done"
            ? undefined
            : "Upload a CSV file with your property data"
      }
    >
      {/* ── Stage: upload-map ─────────────────────────────────── */}
      {stage === "upload-map" && (
        <form onSubmit={handleContinueToReview} className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <ProField label="CSV file">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
              </ProField>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="shrink-0 h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Download template
            </button>
          </div>

          {columns.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Column mapping
              </p>
              <div className="flex flex-col gap-2">
                {columns.map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="w-1/3 shrink-0 truncate text-[12px] font-medium text-slate-700">
                      {col}
                    </span>
                    <select
                      value={columnMap[col] ?? "__skip__"}
                      onChange={(e) =>
                        setColumnMap((prev) => ({ ...prev, [col]: e.target.value }))
                      }
                      className={`${proSelectClass} flex-1`}
                    >
                      {PROPERTY_FIELDS.map((f) => (
                        <option
                          key={f.value}
                          value={f.value}
                          disabled={
                            f.value !== "__skip__" &&
                            usedFields.has(f.value) &&
                            columnMap[col] !== f.value
                          }
                        >
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {rows.length} {rows.length === 1 ? "row" : "rows"} found
              </p>
            </div>
          )}

          <ProField label="Assign to client portfolio">
            <select
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setError(null); }}
              className={proSelectClass}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </ProField>

          <ProFormError message={error} />

          <ProModalActions
            onCancel={handleClose}
            submitLabel="Continue to review"
            pendingLabel="Continuing…"
            isPending={false}
            submitDisabled={!clientId || rows.length === 0}
          />
        </form>
      )}

      {/* ── Stage: review ─────────────────────────────────────── */}
      {stage === "review" && (
        <div className="flex flex-col gap-4">
          {/* Filter chips */}
          <div className="flex items-center gap-1.5">
            <Chip label={`All ${mappedRows.length}`} active={chip === "all"} onClick={() => setChip("all")} />
            <Chip label={`Will import ${validRows.length}`} active={chip === "import"} onClick={() => setChip("import")} />
            {invalidRows.length > 0 && (
              <Chip label={`Will skip ${invalidRows.length}`} active={chip === "skip"} onClick={() => setChip("skip")} />
            )}
          </div>

          {/* Review table */}
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 w-6">#</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 hidden sm:table-cell">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 hidden sm:table-cell">City</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 w-16">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
                    <tr
                      key={row.index}
                      className={cn(
                        "border-b border-slate-100 last:border-0",
                        !row.valid && "bg-amber-50/50",
                      )}
                    >
                      <td className="px-3 py-2 text-slate-400">{row.index}</td>
                      <td className="px-3 py-2">
                        {row.name ? (
                          <span className="font-medium text-slate-800">{row.name}</span>
                        ) : (
                          <span className="text-amber-600 italic">No name — will skip</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500 hidden sm:table-cell capitalize">{row.type || "—"}</td>
                      <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{row.city || "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{row.status || "—"}</td>
                    </tr>
                  ))}
                  {reviewRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                        No rows match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dedupe toggle */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={createAnyway}
              onChange={(e) => setCreateAnyway(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
            />
            <span className="text-[12.5px] text-slate-600">
              <span className="font-medium">Import duplicates</span>
              {" "}— if a property with the same name already exists in this portfolio, create it anyway
            </span>
          </label>

          {/* Confirm text */}
          {validRows.length > 0 && selectedClient && (
            <p className="text-[12.5px] text-slate-500">
              <span className="font-medium text-slate-800">{validRows.length}</span>{" "}
              {validRows.length === 1 ? "property" : "properties"} will be added to{" "}
              <span className="font-medium text-slate-800">{selectedClient.name}</span>.
              {invalidRows.length > 0 && (
                <> {invalidRows.length} {invalidRows.length === 1 ? "row" : "rows"} will be skipped (no name).</>
              )}
            </p>
          )}

          <ProFormError message={error} />

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStage("upload-map")}
              className="h-9 rounded-md border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isPending || validRows.length === 0}
              className="h-9 rounded-md bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending
                ? "Importing…"
                : `Import ${validRows.length} ${validRows.length === 1 ? "property" : "properties"}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Stage: done ───────────────────────────────────────── */}
      {stage === "done" && importResult && (
        <div className="flex flex-col gap-4">
          {/* Result summary chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Chip
              label={`${importResult.count} added`}
              variant="success"
            />
            {importResult.skipped.length > 0 && (
              <Chip
                label={`${importResult.skipped.length} skipped`}
                variant="warn"
              />
            )}
          </div>

          {/* Skipped detail */}
          {importResult.skipped.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                Skipped rows
              </p>
              <ul className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                {importResult.skipped.map((s) => (
                  <li key={s.row} className="text-[12.5px] text-amber-800">
                    <span className="font-medium">Row {s.row}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {importResult.count === 0 && importResult.skipped.length === 0 && (
            <p className="text-[13px] text-slate-500">No properties were imported.</p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDone}
              className="h-9 rounded-md bg-blue-600 px-5 text-[13px] font-medium text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </ProModal>
  );
}

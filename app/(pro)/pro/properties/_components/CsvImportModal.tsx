"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import Papa from "papaparse";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalActions,
  ProModalSuccess,
  proSelectClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import { importCsvProperties } from "@/app/(pro)/pro/actions";

type ClientOption = {
  id: string;
  name: string;
};

type CsvRow = Record<string, string>;

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
  "Year Built", "Bedrooms", "Bathrooms", "Parking Spaces",
  "Market Value",
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
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

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
        if (results.data.length === 0) {
          setError("CSV file is empty.");
          return;
        }
        const cols = results.meta.fields ?? [];
        setColumns(cols);
        setRows(results.data as CsvRow[]);
        // Auto-map columns
        const autoMap: Record<string, string> = {};
        for (const col of cols) {
          autoMap[col] = autoMapColumn(col);
        }
        setColumnMap(autoMap);
        setError(null);
      },
    });
  }

  function handleColumnMapChange(csvCol: string, field: string) {
    setColumnMap((prev) => ({ ...prev, [csvCol]: field }));
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    if (rows.length === 0) {
      setError("No CSV data to import.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const mapped = rows.map((row) => {
        const raw = mapRowToProperty(row);
        return {
          name: (raw.name as string) ?? "",
          type: ((raw.type as string) ?? "residential").toLowerCase(),
          status: (raw.status as string) ?? "Rented",
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
        };
      });

      const result = await importCsvProperties({
        clientId,
        rows: mapped,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccessCount(result.count ?? mapped.length);
    });
  }

  function handleComplete() {
    setSuccessCount(null);
    setRows([]);
    setColumns([]);
    setColumnMap({});
    setClientId("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
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

  const usedFields = useMemo(() => {
    const used = new Set(Object.values(columnMap).filter((v) => v !== "__skip__"));
    return used;
  }, [columnMap]);

  return (
    <ProModal
      open={open}
      onOpenChange={(o) => {
        if (!o && !isPending) {
          setSuccessCount(null);
          setRows([]);
          setColumns([]);
          setColumnMap({});
          setClientId("");
          setError(null);
          onOpenChange(false);
        }
      }}
      title="Import properties from CSV"
      description="Upload a CSV file with your property data"
    >
      {successCount !== null ? (
        <ProModalSuccess
          message={`${successCount} ${successCount === 1 ? "property has" : "properties have"} been imported successfully.`}
          onComplete={handleComplete}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <ProField label="CSV file">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-400 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
              </ProField>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="shrink-0 h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Download template
            </button>
          </div>

          {columns.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Column mapping
              </p>
              <div className="flex flex-col gap-2">
                {columns.map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="w-1/3 shrink-0 truncate text-[12px] font-medium text-slate-700 dark:text-slate-300">
                      {col}
                    </span>
                    <select
                      value={columnMap[col] ?? "__skip__"}
                      onChange={(e) => handleColumnMapChange(col, e.target.value)}
                      className={`${proSelectClass} flex-1`}
                    >
                      {PROPERTY_FIELDS.map((f) => (
                        <option key={f.value} value={f.value} disabled={f.value !== "__skip__" && usedFields.has(f.value) && columnMap[col] !== f.value}>
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
              autoFocus
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </ProField>

          <ProFormError message={error} />

          <ProModalActions
            onCancel={() => onOpenChange(false)}
            submitLabel={`Import ${rows.length > 0 ? `${rows.length} ` : ""}properties`}
            pendingLabel="Importing…"
            isPending={isPending}
            submitDisabled={!clientId || rows.length === 0}
          />
        </form>
      )}
    </ProModal>
  );
}
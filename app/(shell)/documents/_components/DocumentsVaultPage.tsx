"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { DocumentsVaultPageData } from "../queries";
import {
  buildRows,
  computeMetrics,
  propertySpanLabel,
  categoryOptions,
  propertyOptions,
  documentPreviewHref,
} from "../_lib/vault-rows";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppHeader } from "@/components/layout/AppHeader";

const PAGE_SIZE = 20;

type VaultRow = ReturnType<typeof buildRows>[number];

const ALL = "all";

export function DocumentsVaultPage({ data }: { data: DocumentsVaultPageData }) {
  const { documents, propertyNames } = data;
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [propertyId, setPropertyId] = useState(ALL);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => buildRows(documents, propertyNames), [documents, propertyNames]);
  const metrics = useMemo(() => computeMetrics(documents), [documents]);
  const categories = useMemo(() => categoryOptions(rows), [rows]);
  const properties = useMemo(() => propertyOptions(rows), [rows]);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const matchesSearch = !q || row.name.toLowerCase().includes(q);
    const matchesCategory = category === ALL || row.category === category;
    const matchesProperty = propertyId === ALL || row.propertyId === propertyId;
    return matchesSearch && matchesCategory && matchesProperty;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <main className="h-full flex flex-col bg-val-bg-page-alt">
      <AppHeader />

      <div className="flex-1 overflow-auto scrollbar-none px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5 pt-6">
          {/* Page header */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-val-primary-dark">
                Valgate
              </span>
              <span className="text-[11px] text-slate-300">/</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                Documents
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">
              Documents
            </h1>
            <p className="text-[14px] sm:text-[15px] text-slate-500 mt-2">
              Every file uploaded across your portfolio, in one vault.
            </p>
          </div>

          {/* Metric strip — only the two numbers the records can prove. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle rounded-xl border border-border-subtle bg-surface-base">
            <Metric
              label="Documents"
              value={String(metrics.count)}
              sub={propertySpanLabel(metrics.propertyCount)}
            />
            <Metric
              label="Total storage"
              value={metrics.storageLabel}
              sub="Sum of recorded file sizes"
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetToFirstPage();
                }}
                placeholder="Search by file name"
                aria-label="Search documents by file name"
                className="h-9 w-full rounded-md border border-border-default bg-surface-base pl-9 pr-3 text-[13px] text-foreground placeholder:text-tertiary outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20"
              />
            </div>

            <label className="sr-only" htmlFor="documents-category-filter">
              Filter by category
            </label>
            <select
              id="documents-category-filter"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                resetToFirstPage();
              }}
              className="h-9 rounded-md border border-border-default bg-surface-base px-3 text-[13px] text-secondary outline-none focus-visible:border-border-focus"
            >
              <option value={ALL}>All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="documents-property-filter">
              Filter by property
            </label>
            <select
              id="documents-property-filter"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                resetToFirstPage();
              }}
              className="h-9 rounded-md border border-border-default bg-surface-base px-3 text-[13px] text-secondary outline-none focus-visible:border-border-focus"
            >
              <option value={ALL}>All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-base">
            {pageRows.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" aria-hidden="true" />}
                title={rows.length === 0 ? "No documents yet" : "No documents match your filters"}
                description={
                  rows.length === 0
                    ? "Files uploaded to a property will show up here."
                    : "Try a different search term or clear the filters."
                }
              />
            ) : (
              <div>
                {pageRows.map((row) => (
                  <DocumentRow
                    key={row.id}
                    row={row}
                    onOpen={() => router.push(documentPreviewHref(row))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default text-secondary transition-colors hover:bg-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === safePage ? "page" : undefined}
                  className={`h-8 min-w-8 rounded-md px-2 text-[13px] transition-colors ${
                    p === safePage
                      ? "bg-interactive-primary text-white"
                      : "border border-border-default text-secondary hover:bg-surface-tint"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default text-secondary transition-colors hover:bg-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2 p-5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-tertiary">
        {label}
      </span>
      <span className="text-[20px] font-semibold leading-none text-val-heading tabular-nums">
        {value}
      </span>
      <span className="text-[12px] text-secondary">{sub}</span>
    </div>
  );
}

function DocumentRow({ row, onOpen }: { row: VaultRow; onOpen: () => void }) {
  const verifies = row.verifiesEntityType ? (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.verifiesClass}`}
    >
      {row.verifiesLabel}
    </span>
  ) : (
    <span className="text-[14px] text-text-disabled">—</span>
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${row.name}`}
      className="grid w-full grid-cols-1 gap-3 border-b border-border-subtle px-4 py-2.5 text-left last:border-b-0 transition-colors hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus sm:grid-cols-[minmax(0,1fr)_170px_140px_64px_110px] sm:items-center"
    >
      <span className="flex min-w-0 items-start gap-3 sm:items-center">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[8px] font-bold ${row.tileClass}`}
          aria-hidden="true"
        >
          {row.fileTypeLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-val-heading">{row.name}</span>
          <span className="mt-px block text-[12px] font-normal text-text-tertiary">{row.category}</span>
          <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:hidden">
            <MobileDetail label="Property">{row.propertyName}</MobileDetail>
            <MobileDetail label="Verifies">{verifies}</MobileDetail>
            <MobileDetail label="Size">{row.size}</MobileDetail>
            <MobileDetail label="Uploaded">{row.uploaded}</MobileDetail>
          </span>
        </span>
      </span>
      <span className="hidden w-[170px] truncate text-[12px] font-medium text-secondary sm:block">
        {row.propertyName}
      </span>
      <span className="hidden w-[140px] sm:block">{verifies}</span>
      <span className="hidden w-16 text-[13px] tabular-nums text-secondary sm:block">{row.size}</span>
      <span className="hidden w-[110px] text-[13px] text-secondary sm:block">{row.uploaded}</span>
    </button>
  );
}

function MobileDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
        {label}
      </span>
      <span className="block truncate text-[13px] text-secondary">{children}</span>
    </span>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Files,
  Folder,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  List,
  MoreHorizontal,
} from "lucide-react";
import type { DocumentsVaultPageData } from "../queries";
import {
  buildRows,
  computeMetrics,
  propertySpanLabel,
  categoryOptions,
  propertyOptions,
  documentPreviewHref,
  recentRows,
  unfiledRows,
  propertyDocumentCounts,
  mapRowsToGridCards,
} from "../_lib/vault-rows";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppHeader } from "@/components/layout/AppHeader";

const PAGE_SIZE = 20;

type VaultRow = ReturnType<typeof buildRows>[number];

const ALL = "all";
type VaultView = "all" | "recent" | "unfiled" | "property";
type DisplayMode = "list" | "grid";

export function DocumentsVaultPage({ data }: { data: DocumentsVaultPageData }) {
  const { documents, propertyNames, folders } = data;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [propertyId, setPropertyId] = useState(ALL);
  const [vaultView, setVaultView] = useState<VaultView>("all");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [page, setPage] = useState(1);
  const [showAllProperties, setShowAllProperties] = useState(false);

  const rows = useMemo(
    () => buildRows(documents, propertyNames),
    [documents, propertyNames],
  );
  const metrics = useMemo(() => computeMetrics(documents), [documents]);
  const categories = useMemo(() => categoryOptions(rows), [rows]);
  const properties = useMemo(() => propertyOptions(rows), [rows]);
  const treeProperties = useMemo(() => propertyDocumentCounts(rows), [rows]);
  const unfiled = useMemo(() => unfiledRows(rows), [rows]);

  const q = search.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesSearch = !q || row.name.toLowerCase().includes(q);
    const matchesCategory = category === ALL || row.category === category;
    const matchesProperty = propertyId === ALL || row.propertyId === propertyId;
    return matchesSearch && matchesCategory && matchesProperty;
  });
  const filtered =
    vaultView === "unfiled" ? unfiledRows(filteredRows) : filteredRows;
  const orderedRows = vaultView === "recent" ? recentRows(filtered) : filtered;

  const totalPages = Math.max(1, Math.ceil(orderedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = orderedRows.slice(pageStart, pageStart + PAGE_SIZE);
  const gridCards = useMemo(() => mapRowsToGridCards(pageRows), [pageRows]);

  function resetToFirstPage() {
    setPage(1);
  }

  function selectView(view: Exclude<VaultView, "property">) {
    setVaultView(view);
    setPropertyId(ALL);
    resetToFirstPage();
  }

  function selectProperty(id: string) {
    setVaultView("property");
    setPropertyId(id);
    resetToFirstPage();
  }

  return (
    <main className="h-full flex flex-col bg-val-bg-page-alt">
      <AppHeader />

      <div className="flex-1 overflow-auto scrollbar-none px-4 pb-10 pt-8 sm:px-8 xl:px-[88px]">
        <div className="flex flex-col gap-5">
          {/* Page header */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-val-primary-dark">
                Valgate
              </span>
              <span className="text-[11px] text-text-disabled">/</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
                Documents
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">
              Documents
            </h1>
            <p className="mt-2 text-[14px] text-secondary sm:text-[15px]">
              Every file uploaded across your portfolio, in one vault.
            </p>
          </div>

          {/* Metric strip — only the two numbers the records can prove. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle rounded-xl border border-border-subtle bg-surface-base">
            <Metric
              label="Total documents"
              value={String(metrics.count)}
              sub={propertySpanLabel(metrics.propertyCount)}
            />
            <Metric
              label="Total storage"
              value={metrics.storageLabel}
              sub="Sum of recorded file sizes"
            />
          </div>

          <div className="flex flex-col gap-5 lg:flex-row">
            <aside className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-border-default bg-surface-base p-3 lg:w-[264px]">
              {/* A portfolio-level folder cannot be created: folders require a propertyId. */}
              <div className="px-1 py-0.5 text-[13px] font-bold text-val-heading">
                Vault
              </div>

              <nav
                className="flex flex-col gap-3"
                aria-label="Document vault views"
              >
                <TreeGroupLabel>Views</TreeGroupLabel>
                <div className="-mt-2 flex flex-col gap-1">
                  <VaultTreeRow
                    active={vaultView === "all"}
                    count={rows.length}
                    icon={<Files className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => selectView("all")}
                  >
                    All documents
                  </VaultTreeRow>
                  <VaultTreeRow
                    active={vaultView === "recent"}
                    count={rows.length}
                    icon={<Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => selectView("recent")}
                  >
                    Recent
                  </VaultTreeRow>
                  <VaultTreeRow
                    active={vaultView === "unfiled"}
                    count={unfiled.length}
                    icon={
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    }
                    onClick={() => selectView("unfiled")}
                  >
                    Unfiled
                  </VaultTreeRow>
                </div>

                {treeProperties.length > 0 && (
                  <>
                    <TreeGroupLabel>Properties</TreeGroupLabel>
                    <div className="-mt-2 flex flex-col gap-1">
                      {treeProperties
                        .slice(0, showAllProperties ? undefined : 5)
                        .map((property) => (
                          <VaultTreeRow
                            key={property.id}
                            active={
                              vaultView === "property" &&
                              propertyId === property.id
                            }
                            count={property.count}
                            icon={
                              <FolderOpen
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            }
                            onClick={() => selectProperty(property.id)}
                          >
                            {property.name}
                          </VaultTreeRow>
                        ))}
                      {treeProperties.length > 5 && !showAllProperties && (
                        <button
                          type="button"
                          onClick={() => setShowAllProperties(true)}
                          className="flex h-7 w-full items-center rounded-md px-2.5 text-left text-[12px] font-medium text-secondary transition-colors hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          +{treeProperties.length - 5} more
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Documents have no expiry field, so the design's Expiring soon view cannot be truthful. */}
                {/* Shared folders need a sharing model that this schema does not provide. */}
                <div className="mt-1 border border-border-subtle px-1.5 pb-0.5 pt-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    Storage
                  </div>
                  <p className="mt-2 text-[11px] text-secondary">
                    {metrics.storageLabel} used · {metrics.count}{" "}
                    {metrics.count === 1 ? "file" : "files"}
                  </p>
                </div>
              </nav>
            </aside>

            <div className="min-w-0 flex flex-1 flex-col gap-4">
              {folders.length > 0 && (
                <section
                  className="flex flex-col gap-2"
                  aria-labelledby="documents-folders-heading"
                >
                  <h2
                    id="documents-folders-heading"
                    className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary"
                  >
                    Folders
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        title={`${folder.name} · ${folder.propertyName}`}
                        className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border-default bg-surface-base px-3.5 py-3"
                      >
                        <Folder
                          className="h-[18px] w-[18px] text-status-warning"
                          aria-hidden="true"
                        />
                        <span className="truncate text-[13px] font-semibold text-val-heading">
                          {folder.name}
                        </span>
                        {/* Folders are property-scoped and many share a name ("Title" exists on
                            several properties), so the property belongs on the face of the card,
                            not only in the title attribute — otherwise the row shows the same
                            label with no way to tell the cards apart. */}
                        <span className="truncate text-[12px] text-text-tertiary">
                          {folder.count} {folder.count === 1 ? "file" : "files"} · {folder.propertyName}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section
                className="flex min-w-0 flex-col gap-2"
                aria-labelledby="documents-files-heading"
              >
                <h2
                  id="documents-files-heading"
                  className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary"
                >
                  Files
                </h2>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
                    <span>Files</span>
                    <span className="font-normal text-text-disabled">
                      {orderedRows.length}
                    </span>
                  </p>
                  <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                    <div className="relative min-w-[200px] flex-1 sm:max-w-[220px]">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
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
                        className="h-9 w-full rounded-md border border-border-default bg-surface-base pl-9 pr-3 text-[13px] text-foreground placeholder:text-text-tertiary outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20"
                      />
                    </div>

                    <label
                      className="sr-only"
                      htmlFor="documents-category-filter"
                    >
                      Filter by category
                    </label>
                    <select
                      id="documents-category-filter"
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        resetToFirstPage();
                      }}
                      className="h-7 rounded border border-border-default bg-surface-base px-3 text-[12px] font-semibold text-secondary outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20"
                    >
                      <option value={ALL}>All categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <label
                      className="sr-only"
                      htmlFor="documents-property-filter"
                    >
                      Filter by property
                    </label>
                    <select
                      id="documents-property-filter"
                      value={propertyId}
                      onChange={(e) => {
                        const nextPropertyId = e.target.value;
                        setPropertyId(nextPropertyId);
                        setVaultView(
                          nextPropertyId === ALL ? "all" : "property",
                        );
                        resetToFirstPage();
                      }}
                      className="h-7 rounded border border-border-default bg-surface-base px-3 text-[12px] font-semibold text-secondary outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20"
                    >
                      <option value={ALL}>All properties</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <div
                      className="flex rounded bg-val-bg-tint p-1"
                      role="group"
                      aria-label="Document layout"
                    >
                      <button
                        type="button"
                        aria-pressed={displayMode === "list"}
                        onClick={() => setDisplayMode("list")}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                          displayMode === "list"
                            ? "bg-surface-base text-val-primary-dark"
                            : "text-text-tertiary"
                        }`}
                      >
                        <List className="h-4 w-4" aria-hidden="true" />
                        List
                      </button>
                      <button
                        type="button"
                        aria-pressed={displayMode === "grid"}
                        onClick={() => setDisplayMode("grid")}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                          displayMode === "grid"
                            ? "bg-surface-base text-val-primary-dark"
                            : "text-text-tertiary"
                        }`}
                      >
                        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                        Grid
                      </button>
                    </div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border-default bg-surface-base">
                    <EmptyState
                      icon={<FileText className="h-6 w-6" aria-hidden="true" />}
                      title={
                        rows.length === 0
                          ? "No documents yet"
                          : "No documents match your filters"
                      }
                      description={
                        rows.length === 0
                          ? "Files uploaded to a property will show up here."
                          : "Try a different search term or clear the filters."
                      }
                    />
                    <div className="flex flex-wrap gap-3 px-4 pb-4">
                      <span className="rounded-full border border-border-default px-3.5 py-1.5 text-[11px] text-secondary">
                        Supported: JPEG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX
                      </span>
                    </div>
                  </div>
                ) : displayMode === "list" ? (
                  <div className="overflow-hidden rounded-lg border border-border-default bg-surface-base">
                    {pageRows.map((row) => (
                      <DocumentRow key={row.id} row={row} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {gridCards.map((card) => (
                      <DocumentGridCard key={card.id} card={card} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {orderedRows.length > PAGE_SIZE && (
                  <div className="flex flex-col items-center justify-between gap-3 border border-border-default bg-val-bg-page-alt p-4 sm:flex-row">
                    <p className="text-[12px] text-text-tertiary">
                      Showing {pageRows.length === 0 ? 0 : pageStart + 1}–
                      {pageStart + pageRows.length} of {orderedRows.length}{" "}
                      documents
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage(Math.max(1, safePage - 1))}
                        disabled={safePage === 1}
                        className="flex h-11 w-11 items-center justify-center rounded border border-border-default text-secondary transition-colors hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            aria-current={p === safePage ? "page" : undefined}
                            className={`h-7 w-8 rounded px-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                              p === safePage
                                ? "bg-interactive-primary text-text-inverse"
                                : "text-secondary hover:bg-surface-tint"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setPage(Math.min(totalPages, safePage + 1))
                        }
                        disabled={safePage === totalPages}
                        className="flex h-11 w-11 items-center justify-center rounded border border-border-default text-secondary transition-colors hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
        {label}
      </span>
      <span className="text-[20px] font-semibold leading-none text-val-heading tabular-nums">
        {value}
      </span>
      <span className="text-[12px] text-text-tertiary">{sub}</span>
    </div>
  );
}

function TreeGroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="px-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
      {children}
    </span>
  );
}

function VaultTreeRow({
  active,
  count,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-7 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
        active
          ? "bg-surface-tint text-interactive-primary"
          : "text-secondary hover:bg-surface-tint"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <span className="text-[11px] text-text-tertiary">{count}</span>
    </button>
  );
}

function DocumentRow({ row }: { row: VaultRow }) {
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
    <Link
      href={documentPreviewHref(row)}
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
          <span className="block truncate text-[14px] font-medium text-val-heading">
            {row.name}
          </span>
          <span className="mt-px block text-[12px] font-normal text-text-tertiary">
            {row.category}
          </span>
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
      <span className="hidden w-16 text-[13px] tabular-nums text-secondary sm:block">
        {row.size}
      </span>
      <span className="hidden w-[110px] text-[13px] text-secondary sm:block">
        {row.uploaded}
      </span>
    </Link>
  );
}

function DocumentGridCard({
  card,
}: {
  card: ReturnType<typeof mapRowsToGridCards>[number];
}) {
  const verifies = card.verifiesEntityType ? (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.verifiesClass}`}
    >
      {card.verifiesLabel}
    </span>
  ) : (
    <span className="text-[14px] text-text-disabled">—</span>
  );

  return (
    <Link
      href={documentPreviewHref(card)}
      aria-label={`Open ${card.name}`}
      className="flex flex-col overflow-hidden rounded-[10px] border border-border-default bg-surface-base text-left transition-colors hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <div className="grid h-[130px] place-items-center bg-surface-tint">
        <span
          className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[8px] font-bold ${card.tileClass}`}
          aria-hidden="true"
        >
          {card.fileTypeLabel}
        </span>
      </div>
      <div className="flex flex-col gap-[5px] p-3">
        <span className="truncate text-[14px] font-medium text-val-heading">
          {card.name}
        </span>
        <span className="truncate text-[12px] text-text-tertiary">
          {card.propertyName} · {card.category}
        </span>
        <span className="flex items-center justify-between">
          {verifies}
          <MoreHorizontal
            className="h-4 w-4 text-text-tertiary"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

function MobileDetail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
        {label}
      </span>
      <span className="block truncate text-[13px] text-secondary">
        {children}
      </span>
    </span>
  );
}

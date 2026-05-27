"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Mail,
  Phone,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Star,
  Plus,
  UsersRound,
  BadgeCheck,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { cn } from "@/components/ui/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddProfessionalWizard } from "@/components/directory/AddProfessionalWizard";
import type { Category, Professional, DirectoryPageData } from "../queries";

const ITEMS_PER_PAGE = 12;

type SortOption = "Rating" | "Name" | "Properties";

const CATEGORY_BADGE: Record<Exclude<Category, "All">, string> = {
  Agent:       "bg-blue-50 text-blue-700",
  Lawyer:      "bg-purple-50 text-purple-700",
  Notary:      "bg-indigo-50 text-indigo-700",
  Maintenance: "bg-green-50 text-green-700",
  Accountant:  "bg-emerald-50 text-emerald-700",
  Electrician: "bg-amber-50 text-amber-700",
  Inspector:   "bg-rose-50 text-rose-700",
  Plumber:     "bg-teal-50 text-teal-700",
};


function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          fill="currentColor"
          className={cn(
            "size-3",
            i <= Math.floor(rating) ? "text-amber-400" : "text-slate-200",
          )}
        />
      ))}
        <span className="text-[12px] text-slate-400 pl-1">
        {rating.toFixed(1)} ({count})
      </span>
    </div>
  );
}

function ProfessionalCard({ pro, index }: { pro: Professional; index: number }) {
  const badgeClass = CATEGORY_BADGE[pro.category];
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (copied) return;
    navigator.clipboard.writeText(`${pro.name} — ${pro.company}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className="bg-white rounded-xl p-6 flex flex-col shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]
                 transition-all duration-200 ease-out
                 hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]
                 animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]"
      style={{ animationDelay: `${160 + index * 55}ms` }}
    >
      {/* Avatar + badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <div
            className={cn(
              "size-16 rounded-full flex items-center justify-center text-white font-bold text-lg ring-4 ring-[#dbe1ff]",
              pro.avatarBg,
            )}
          >
            {pro.initials}
          </div>
          {pro.available && (
            <div className="absolute bottom-0 right-0 size-5 rounded-full bg-green-500 border-2 border-white" />
          )}
          {pro.verified && (
            <div
              className="absolute -top-1 -right-1 size-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center"
              title="Valgate Verified"
            >
              <BadgeCheck className="size-3 text-white" />
            </div>
          )}
        </div>
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-1 rounded-full",
            badgeClass,
          )}
        >
          {pro.category}
        </span>
      </div>

      {/* Name + company */}
      <h3 className="text-[15px] sm:text-[18px] font-semibold text-val-heading leading-7">{pro.name}</h3>
      <p className="text-[14px] sm:text-[15px] text-slate-500 mb-3">{pro.company}</p>

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={pro.rating} count={pro.reviewCount} />
      </div>

      {/* Contact actions */}
      <div className="bg-val-bg-tint rounded-lg p-3 flex items-center justify-between mb-4">
        <div className="flex gap-3">
          <button
            onClick={pro.email ? () => window.open(`mailto:${pro.email}`, "_self") : undefined}
            disabled={!pro.email}
            className={cn(
              "size-8 bg-white rounded-full flex items-center justify-center transition-all duration-150",
              pro.email
                ? "hover:bg-slate-50 hover:scale-110 active:scale-95"
                : "opacity-40 cursor-not-allowed",
            )}
            title={pro.email ?? "No email on record"}
          >
            <Mail className="size-3.5 text-slate-500" />
          </button>
          <button
            onClick={pro.phone ? () => window.open(`tel:${pro.phone}`, "_self") : undefined}
            disabled={!pro.phone}
            className={cn(
              "size-8 bg-white rounded-full flex items-center justify-center transition-all duration-150",
              pro.phone
                ? "hover:bg-slate-50 hover:scale-110 active:scale-95"
                : "opacity-40 cursor-not-allowed",
            )}
            title={pro.phone ?? "No phone on record"}
          >
            <Phone className="size-3.5 text-slate-500" />
          </button>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
            copied
              ? "text-green-600 pointer-events-none"
              : "text-[--val-primary-dark] hover:opacity-75",
          )}
        >
          <span
            className={cn(
              "transition-all duration-200",
              copied ? "scale-110" : "scale-100",
            )}
          >
            {copied
              ? <Check className="size-3 animate-[scale-in_0.2s_cubic-bezier(0.22,1,0.36,1)_both]" />
              : <Copy className="size-3" />
            }
          </span>
          <span className="transition-all duration-200">
            {copied ? "COPIED" : "COPY INFO"}
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[12px] text-slate-400">
          Linked Properties:{" "}
          <span className="font-semibold text-val-heading">{pro.linkedProperties}</span>
        </span>
        <Link
          href={`/directory/${pro.id}`}
          className="flex items-center gap-0.5 text-[--val-primary-dark] text-xs font-semibold transition-all duration-150 hover:opacity-75 hover:gap-1 active:scale-95"
        >
          VIEW PROFILE
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

export function ProfessionalDirectoryPage({ data }: { data: DirectoryPageData }) {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortOption>("Rating");
  const [currentPage, setCurrentPage] = useState(1);
  const [addWizardOpen, setAddWizardOpen] = useState(false);

  const { professionals, categories } = data;

  const filtered = professionals
    .filter((p) => {
      const matchesCat = activeCategory === "All" || p.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "Name") return a.name.localeCompare(b.name);
      if (sortBy === "Properties") return b.linkedProperties - a.linkedProperties;
      return b.rating - a.rating;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, sortBy]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader />

      {/* -- Page Content -- */}
      <div className="flex-1 overflow-y-auto bg-val-bg-page-alt">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {/* Page Header */}
          <div
            className="flex items-end justify-between mb-10 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">
                  Valgate
                </span>
                <span className="text-[11px] text-slate-300">/</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Professional Directory
                </span>
              </div>
              <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">
                Trusted Professionals
              </h1>
              <p className="text-[14px] sm:text-[15px] text-slate-500 mt-2">
                Manage and connect with your network of property service providers.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
<button
                type="button"
                onClick={() => setAddWizardOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
              >
                <Plus className="size-3.5" />
                ADD PROFESSIONAL
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div
            className="flex items-center gap-4 mb-4 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] [animation-delay:60ms]"
          >
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors peer-focus:text-blue-500" />
              <input
                type="text"
                placeholder="Search by name, profession or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="peer w-full bg-val-bg-tint pl-12 pr-4 py-3 text-sm placeholder-slate-400 text-slate-700 rounded outline-none focus:ring-2 focus:ring-blue-200 transition-shadow duration-200"
              />
            </div>

            {/* Grid / List toggle */}
            <div className="bg-val-bg-tint p-1 rounded flex shrink-0">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded transition-all duration-150",
                  view === "grid"
                    ? "bg-white text-[--val-primary-dark] shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                Grid
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded transition-all duration-150",
                  view === "list"
                    ? "bg-white text-[--val-primary-dark] shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                List
              </button>
            </div>

            {/* Sort */}
            <div className="relative w-48 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full appearance-none bg-val-bg-tint px-4 py-3 pr-8 text-sm font-semibold text-val-heading rounded outline-none cursor-pointer transition-shadow duration-200 focus:ring-2 focus:ring-blue-200"
              >
                <option value="Rating">Sort by: Rating</option>
                <option value="Name">Sort by: Name</option>
                <option value="Properties">Sort by: Properties</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Category Pills */}
          <div
            className="flex gap-2 flex-wrap mb-8 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] [animation-delay:100ms]"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150",
                  activeCategory === cat
                    ? "bg-[--val-primary-dark] text-white shadow-md ring-2 ring-[--val-primary-dark]/20 scale-[1.03]"
                    : "bg-val-bg-tint text-slate-500 hover:bg-blue-100 hover:text-slate-700",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div
            key={`${activeCategory}-${searchQuery}-${sortBy}`}
            className={cn(
              "mb-8",
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                : "flex flex-col gap-4",
            )}
          >
            {paginated.map((pro, i) => (
              <ProfessionalCard key={pro.id} pro={pro} index={i} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 animate-[fade-slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
                <EmptyState
                  icon={<UsersRound className="size-6" />}
                  title="No professionals found"
                  description="Try a different search or category filter."
                />
              </div>
            )}
          </div>

          {/* Pagination */}
          <div
            className="border-t border-slate-100 pt-8 flex items-center justify-between animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] [animation-delay:120ms]"
          >
            <p className="text-slate-500 text-sm">
              Showing{" "}
              <span className="font-semibold text-val-heading">{filtered.length}</span>{" "}
              of{" "}
              <span className="font-semibold text-val-heading">{professionals.length}</span>{" "}
              professionals
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="size-10 bg-val-bg-tint rounded flex items-center justify-center text-slate-500 transition-all duration-150 hover:bg-blue-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setCurrentPage(n)}
                    className={cn(
                      "size-10 rounded text-sm font-semibold transition-all duration-150",
                      n === currentPage
                        ? "bg-[--val-primary-dark] text-white"
                        : "bg-val-bg-tint text-slate-500 hover:bg-blue-100 active:scale-95",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="size-10 bg-val-bg-tint rounded flex items-center justify-center text-slate-500 transition-all duration-150 hover:bg-blue-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddProfessionalWizard
        open={addWizardOpen}
        onOpenChange={setAddWizardOpen}
      />
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
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
  Bell,
  HelpCircle,
  Plus,
  Upload,
} from "lucide-react";
import { cn } from "../components/ui/utils";

type Category =
  | "All"
  | "Agent"
  | "Lawyer"
  | "Notary"
  | "Electrician"
  | "Plumber"
  | "Inspector"
  | "Maintenance"
  | "Accountant";

interface Professional {
  id: number;
  name: string;
  company: string;
  category: Exclude<Category, "All">;
  rating: number;
  reviewCount: number;
  linkedProperties: number;
  available: boolean;
  initials: string;
  avatarBg: string;
}

const professionals: Professional[] = [
  {
    id: 1,
    name: "Sarah Mitchell",
    company: "Luxe Realty Group",
    category: "Agent",
    rating: 5.0,
    reviewCount: 124,
    linkedProperties: 12,
    available: true,
    initials: "SM",
    avatarBg: "bg-blue-400",
  },
  {
    id: 2,
    name: "Sok Dara",
    company: "Phnom Penh Notary Office",
    category: "Notary",
    rating: 4.9,
    reviewCount: 82,
    linkedProperties: 4,
    available: false,
    initials: "SD",
    avatarBg: "bg-indigo-400",
  },
  {
    id: 3,
    name: "Chea Sophal",
    company: "Pro Fix Cambodia",
    category: "Maintenance",
    rating: 5.0,
    reviewCount: 206,
    linkedProperties: 18,
    available: true,
    initials: "CS",
    avatarBg: "bg-green-400",
  },
  {
    id: 4,
    name: "Ly Bopha",
    company: "ClearBooks Cambodia",
    category: "Accountant",
    rating: 4.1,
    reviewCount: 54,
    linkedProperties: 8,
    available: false,
    initials: "LB",
    avatarBg: "bg-emerald-400",
  },
  {
    id: 5,
    name: "Heng Virak",
    company: "Virak Electric Co.",
    category: "Electrician",
    rating: 4.8,
    reviewCount: 115,
    linkedProperties: 21,
    available: true,
    initials: "HV",
    avatarBg: "bg-amber-400",
  },
  {
    id: 6,
    name: "Noun Sreymom",
    company: "Cambodia Property Inspections",
    category: "Inspector",
    rating: 5.0,
    reviewCount: 39,
    linkedProperties: 31,
    available: true,
    initials: "NS",
    avatarBg: "bg-rose-400",
  },
];

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

const CATEGORIES: Category[] = [
  "All", "Agent", "Lawyer", "Notary", "Maintenance", "Electrician", "Plumber", "Inspector", "Accountant",
];

const TOP_NAV_LINKS = [
  { label: "Home",      path: "/" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Directory", path: "/directory" },
  { label: "Analytics", path: "/analytics" },
];

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i <= Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
      <span className="text-xs font-semibold text-slate-400 pl-1">
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
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold tracking-[1px] uppercase px-3 py-1 rounded-full",
            badgeClass,
          )}
        >
          {pro.category}
        </span>
      </div>

      {/* Name + company */}
      <h3 className="text-val-heading font-bold text-lg leading-7">{pro.name}</h3>
      <p className="text-slate-500 text-sm mb-3">{pro.company}</p>

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={pro.rating} count={pro.reviewCount} />
      </div>

      {/* Contact actions */}
      <div className="bg-val-bg-tint rounded-lg p-3 flex items-center justify-between mb-4">
        <div className="flex gap-3">
          <button
            className="size-8 bg-white rounded-full flex items-center justify-center
                       transition-all duration-150 hover:bg-slate-50 hover:scale-110 active:scale-95"
            title="Email"
          >
            <Mail className="size-3.5 text-slate-500" />
          </button>
          <button
            className="size-8 bg-white rounded-full flex items-center justify-center
                       transition-all duration-150 hover:bg-slate-50 hover:scale-110 active:scale-95"
            title="Phone"
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
        <span className="text-slate-500 text-xs">
          Linked Properties:{" "}
          <span className="font-semibold text-val-heading">{pro.linkedProperties}</span>
        </span>
        <button className="flex items-center gap-0.5 text-[--val-primary-dark] text-xs font-semibold transition-all duration-150 hover:opacity-75 hover:gap-1 active:scale-95">
          VIEW PROFILE
          <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function ProfessionalDirectoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = professionals.filter((p) => {
    const matchesCat = activeCategory === "All" || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top Nav Bar ── */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-10">
        {/* Logo + nav links */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 132.863 106.124"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 shrink-0"
              style={{ height: "calc(1.75rem * 106.124 / 132.863)" }}
              aria-hidden="true"
            >
              <path
                d="M98.3597 74.7352L132.863 40.8166L107.951 0H24.9114L23.9449 1.58278L98.3597 74.7352Z"
                fill="#006AFF"
              />
              <path
                d="M82.538 90.2886L90.5536 82.4087L18.0925 11.1724L12.0791 21.0228L82.538 90.2886Z"
                fill="#006AFF"
              />
              <path
                d="M6.22795 30.6128L2.61289e-07 40.817L66.4315 106.124L74.7354 97.9602L6.22795 30.6128Z"
                fill="#006AFF"
              />
            </svg>
            <span
              className="text-base font-bold text-val-heading tracking-tight"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              Valgate
            </span>
          </div>

          <nav className="flex items-stretch h-16">
            {TOP_NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "px-3 text-base font-medium relative transition-colors",
                    isActive
                      ? "text-blue-700 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: bell, help, avatar */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <Bell className="size-5" />
          </button>
          <button className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <HelpCircle className="size-5" />
          </button>
          <div className="size-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center ml-2">
            <span className="text-xs font-semibold text-blue-700">JD</span>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div className="flex-1 overflow-y-auto bg-val-bg-page-alt">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Page Header */}
          <div
            className="flex items-end justify-between mb-10 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">
                  Valgate
                </span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                  Professional Directory
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">
                Trusted Professionals
              </h1>
              <p className="text-slate-500 text-base mt-2">
                Manage and connect with your network of property service providers.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading transition-all duration-150 hover:bg-slate-50 active:scale-[0.98]">
                <Upload className="size-3.5" />
                EXPORT
              </button>
              <button
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
              <select className="w-full appearance-none bg-val-bg-tint px-4 py-3 pr-8 text-sm font-semibold text-val-heading rounded outline-none cursor-pointer transition-shadow duration-200 focus:ring-2 focus:ring-blue-200">
                <option>Sort by: Rating</option>
                <option>Sort by: Name</option>
                <option>Sort by: Properties</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Category Pills */}
          <div
            className="flex gap-2 flex-wrap mb-8 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] [animation-delay:100ms]"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150",
                  activeCategory === cat
                    ? "bg-[--val-primary-dark] text-white scale-[1.03]"
                    : "bg-val-bg-tint text-slate-500 hover:bg-blue-100 hover:text-slate-700",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Cards Grid — key triggers re-animation on filter change */}
          <div
            key={`${activeCategory}-${searchQuery}`}
            className={cn(
              "mb-8",
              view === "grid"
                ? "grid grid-cols-3 gap-6"
                : "flex flex-col gap-4",
            )}
          >
            {filtered.map((pro, i) => (
              <ProfessionalCard key={pro.id} pro={pro} index={i} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-slate-400 text-sm animate-[fade-slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
                No professionals found matching your search.
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
              <span className="font-semibold text-val-heading">142</span>{" "}
              professionals
            </p>
            <div className="flex gap-2">
              <button className="size-10 bg-val-bg-tint rounded flex items-center justify-center text-slate-500 transition-all duration-150 hover:bg-blue-100 active:scale-95">
                <ChevronLeft className="size-4" />
              </button>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className={cn(
                    "size-10 rounded text-sm font-semibold transition-all duration-150",
                    n === 1
                      ? "bg-[--val-primary-dark] text-white"
                      : "bg-val-bg-tint text-slate-500 hover:bg-blue-100 active:scale-95",
                  )}
                >
                  {n}
                </button>
              ))}
              <button className="size-10 bg-val-bg-tint rounded flex items-center justify-center text-slate-500 transition-all duration-150 hover:bg-blue-100 active:scale-95">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

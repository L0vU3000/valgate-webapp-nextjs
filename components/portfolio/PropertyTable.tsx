import { ChevronLeft, ChevronRight, Map } from "lucide-react";
import { TYPE_ICON, TYPE_COLOR, typeBadgeClasses, statusBadgeClasses, titleBadgeClasses, healthDotColor } from "../../lib/property-helpers";
import type { PropertyListItem } from "@/lib/data/types/property";

export interface TableAnimationConfig {
  containerDuration: number;
  containerDelay: number;
  rowDuration: number;
  rowStagger: number;
  healthBarDelay: number;
  healthBarStagger: number;
}

const DEFAULT_ANIMATION_CONFIG: TableAnimationConfig = {
  containerDuration: 250,
  containerDelay: 0,
  rowDuration: 400,
  rowStagger: 25,
  healthBarDelay: 100,
  healthBarStagger: 30,
};

interface PropertyTableProps {
  pageRows: PropertyListItem[];
  pageStart: number;
  filtered: PropertyListItem[];
  properties: PropertyListItem[];
  mounted: boolean;
  navigate: (path: string) => void;
  totalPages: number;
  safePage: number;
  goToPage: (page: number) => void;
  onClearFilters: () => void;
  animationConfig?: TableAnimationConfig;
}

export function PropertyTable({
  pageRows,
  pageStart,
  filtered,
  properties,
  mounted,
  navigate,
  totalPages,
  safePage,
  goToPage,
  onClearFilters,
  animationConfig,
}: PropertyTableProps) {
  const cfg = animationConfig ?? DEFAULT_ANIMATION_CONFIG;
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-8px)",
        transition: `opacity ${cfg.containerDuration}ms cubic-bezier(0.25,1,0.5,1), transform ${cfg.containerDuration}ms cubic-bezier(0.25,1,0.5,1)`,
        transitionDelay: `${cfg.containerDelay}ms`,
      }}
    >
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-4 px-3 w-10">
                <input type="checkbox" aria-label="Select all properties" className="rounded border-slate-300 accent-blue-600" />
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] w-[48px]">
                #
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Property
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Type
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Province
              </th>
              <th className="text-left py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Status
              </th>
              <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Size
              </th>
              <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Buy
              </th>
              <th className="text-center py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Title
              </th>
              <th className="text-right py-4 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                Health
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <p className="text-[14px] text-slate-400">No properties match your filters.</p>
                  <button
                    onClick={onClearFilters}
                    className="mt-3 text-[14px] text-blue-600 font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            ) : (
              pageRows.map((p, i) => {
                const TypeIcon = TYPE_ICON[p.type] ?? Map;
                const typeColor = TYPE_COLOR[p.type] ?? "bg-slate-100 text-slate-500";
                const hDot = healthDotColor(p.health);
                return (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer group transition-colors duration-150"
                    tabIndex={0}
                    role="link"
                    onClick={() => navigate(`/property/${p.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/property/${p.id}`); } }}
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateY(0)" : "translateY(-6px)",
                      transition: `opacity ${cfg.rowDuration}ms cubic-bezier(0.25,1,0.5,1), transform ${cfg.rowDuration}ms cubic-bezier(0.25,1,0.5,1)`,
                      transitionDelay: `${cfg.containerDelay + i * cfg.rowStagger}ms`,
                    }}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        className="rounded border-slate-300 accent-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Row # */}
                    <td className="py-3 px-3 text-[12px] text-slate-400">
                      {pageStart + i + 1}
                    </td>

                    {/* Property — thumbnail + name + code */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${typeColor} transition-transform duration-200 group-hover:scale-105`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] text-val-heading font-medium leading-tight truncate">{p.name}</p>
                          <p className="text-[12px] text-slate-400 mt-0.5 truncate">{p.code}</p>
                        </div>
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${typeBadgeClasses(p.type)}`}>
                        {p.type}
                      </span>
                    </td>

                    {/* Province */}
                    <td className="py-3 px-3 text-[14px] text-slate-700">{p.province}</td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${statusBadgeClasses(p.status)}`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-3 text-right text-[14px] text-slate-600">
                      {p.size} m&sup2;
                    </td>

                    {/* Buy */}
                    <td className="py-3 px-3 text-right text-[14px] font-medium text-slate-900">
                      {p.buy}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-3 text-center">
                      {p.title === "\u2014" ? (
                        <span className="text-slate-400">&mdash;</span>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${titleBadgeClasses(p.title)}`}>
                          {p.title}
                        </span>
                      )}
                    </td>

                    {/* Health */}
                    <td className="py-3 px-3 text-right">
                      <div aria-label={`Health ${p.health}%`} className="inline-flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-[7px] h-[7px] rounded-full ${hDot}`} />
                          <span className="text-[12px] font-medium text-slate-700">{p.health}%</span>
                        </div>
                        <div className="w-[52px] h-[3px] bg-slate-200 rounded-sm overflow-hidden">
                          <div
                            className={`h-full rounded-sm ${hDot} transition-[width] duration-700 ease-out`}
                            style={{
                              width: mounted ? `${p.health}%` : "0%",
                              transitionDelay: `${cfg.containerDelay + cfg.healthBarDelay + i * cfg.healthBarStagger}ms`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-4 bg-slate-50/60 border-t border-slate-200">
        <p className="text-[14px] text-slate-500">
          Showing{" "}
          <span className="font-semibold text-val-heading">{filtered.length}</span>
          {" "}of{" "}
          <span className="font-semibold text-val-heading">{properties.length}</span>
          {" "}properties
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={safePage === 1}
              onClick={() => goToPage(safePage - 1)}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button className="px-3 py-1 rounded text-white text-[14px] font-semibold min-w-[32px] shadow-sm" style={{ background: "var(--val-primary-dark)" }}>
              {safePage}
            </button>
            <button
              disabled={safePage === totalPages}
              onClick={() => goToPage(safePage + 1)}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

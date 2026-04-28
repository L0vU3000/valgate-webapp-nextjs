import { useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";

interface DocumentDetailViewProps {
  documentName: string;
  propertyCode?: string;
  onBack: () => void;
}

const documentPages = [1, 2, 3, 4];

const documentMeta = [
  { label: "Purchase Price", value: "$420,000" },
  { label: "Transfer Tax",   value: "$8,400"   },
  { label: "Agent Fee",      value: "$12,600"  },
  { label: "Stamp Duty",     value: "$6,300"   },
];

const summary =
  "This document certifies the legal transfer of property title for SR00015. It includes details of the purchase agreement, settlement date, registered owner details, and encumbrance status as of the transfer date. All obligations have been satisfied and the title is unencumbered.";

export function DocumentDetailView({ documentName, onBack }: DocumentDetailViewProps) {
  const [activePage, setActivePage] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const displayName = documentName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

  return (
    <div className="flex-1 min-h-full bg-val-bg-page-alt">
      <div className="px-8 pt-8 pb-10">

        {/* Back + Title */}
        <button onClick={onBack} className="flex items-center gap-1.5 mb-4 group">
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-400 group-hover:text-slate-600 transition-colors">
            Documents
          </span>
        </button>

        <div className="mb-7">
          <h1 className="text-4xl font-extrabold tracking-tight leading-10 text-[--val-heading]">
            {displayName}
          </h1>
          <p className="text-slate-500 text-base mt-2">
            Page {activePage} of {documentPages.length}
          </p>
        </div>

        {/* Three-column content row */}
        <div className="flex gap-6 items-start">

          {/* Col 1: Summary + Financials */}
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-2xl font-bold tracking-tight mb-3 text-[--val-heading]">
              Document Summary
            </h2>

            <p className="text-[15px] text-slate-600 leading-relaxed mb-6">
              {expanded ? summary : summary.slice(0, 180) + "… "}
              <button
                onClick={() => setExpanded(!expanded)}
                className="font-semibold text-[--val-primary-dark] transition-opacity hover:opacity-75"
              >
                {expanded ? "Less" : "Read More"}
              </button>
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {documentMeta.map((item) => (
                <div key={item.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400 mb-1">
                    {item.label}
                  </p>
                  <p className="text-[24px] font-bold leading-tight text-[--val-heading]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Document preview */}
          <div className="shrink-0 w-[280px] rounded-xl border border-slate-200 bg-val-bg-tint flex flex-col items-center justify-center min-h-[380px]">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm border border-slate-100">
              <FileText className="size-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-[--val-heading]">
              Preview unavailable
            </p>
            <p className="text-xs text-slate-400 mt-1 text-center max-w-[160px]">
              Open the file to view its contents.
            </p>
          </div>

          {/* Col 3: Page thumbnails */}
          <div className="shrink-0 w-[136px] flex flex-col gap-5 pt-1">
            {documentPages.map((page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className="flex items-center gap-2.5 group"
              >
                <span className="text-[11px] font-semibold text-slate-400 w-4 text-right shrink-0">
                  {page}.
                </span>
                <div
                  className={`flex-1 h-[68px] rounded-lg border transition-all duration-200 flex items-center justify-center overflow-hidden ${
                    activePage === page
                      ? "border-[--val-primary-dark] bg-blue-50/40 shadow-sm"
                      : "bg-white border-slate-200 group-hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1.5 w-full px-2.5">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className={`h-[2px] rounded-full ${
                          activePage === page ? "bg-[--val-primary-dark]/20" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

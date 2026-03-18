import { useState } from "react";
import { ArrowLeft } from "lucide-react";
// Figma asset — no real image available in dev
const imgDocExample1: string | null = null;

interface DocumentDetailViewProps {
  documentName: string;
  onBack: () => void;
}

const documentPages = [
  { id: 1, label: "1." },
  { id: 2, label: "2." },
  { id: 3, label: "3." },
  { id: 4, label: "4." },
];

const boughtPriceData = [
  { label: "Bought Price", value: "$100,000" },
  { label: "Bought Price", value: "$100,000" },
  { label: "Bought Price", value: "$100,000" },
  { label: "Bought Price", value: "$100,000" },
];

export function DocumentDetailView({ documentName, onBack }: DocumentDetailViewProps) {
  const [activePage, setActivePage] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const summaryText =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sodales  sed sapien quis rutrum. Integer viverra a neque in rhoncus. Pellentesque ut nisi velit. Cras commodo nec urna vitae eleifend. Donec ut augue  tincidunt, sagittis enim in, lacinia eros. Proin nec tincidunt magna,  quis lobortis nunc. Nulla congue, purus quis eleifend semper, arcu velit pellentesque odio, ut dictum nunc ipsum non magna.";

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[14px] text-foreground hover:text-foreground/80 mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Title */}
      <h1 className="text-[24px] text-foreground mb-1" style={{ fontWeight: 600 }}>
        SR00015 Documents
      </h1>

      {/* Document Summary heading */}
      <h2 className="text-[20px] text-foreground mb-4" style={{ fontWeight: 600 }}>
        Document Summary
      </h2>

      {/* Main content area */}
      <div className="flex gap-6">
        {/* Left column: summary + prices */}
        <div className="w-[220px] shrink-0">
          {/* Summary text */}
          <p className="text-[14px] text-muted-foreground leading-[22px] mb-4">
            {expanded ? summaryText : summaryText.slice(0, 280) + "... "}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-primary hover:underline cursor-pointer"
            >
              {expanded ? "Show Less" : "Read More"}
            </button>
          </p>

          {/* Bought Price grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {boughtPriceData.map((item, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  {item.label}
                </span>
                <span className="text-[16px] text-foreground leading-[28px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Large document preview */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
            <img
              src={imgDocExample1}
              alt={`${documentName} - Page ${activePage}`}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Right: Page thumbnails */}
        <div className="w-[100px] shrink-0 flex flex-col gap-4">
          {documentPages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`flex items-start gap-2 cursor-pointer group`}
            >
              <span className="text-[12px] text-muted-foreground mt-1 w-[16px] text-right shrink-0">
                {page.label}
              </span>
              <div
                className={`w-[72px] h-[96px] bg-white border rounded-md shadow-sm overflow-hidden transition-all ${
                  activePage === page.id
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border group-hover:border-primary/50"
                }`}
              >
                <img
                  src={imgDocExample1}
                  alt={`Page ${page.id}`}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

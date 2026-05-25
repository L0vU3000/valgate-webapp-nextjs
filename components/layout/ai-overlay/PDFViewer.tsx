"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileX } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type Props = {
  url: string;
  title: string;
};

export function PDFViewer({ url, title }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageDirection, setPageDirection] = useState<1 | -1>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(640);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPageWidth(Math.max(280, Math.min(entry.contentRect.width - 96, 840)));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isLoading || numPages === 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToNextPage();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPreviousPage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setPageNumber(1);
    setIsLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    setLoadError("Could not load this document.");
    setIsLoading(false);
    console.error("[PDFViewer] load error:", err);
  }

  function goToPreviousPage() {
    if (pageNumber <= 1) return;
    setPageDirection(-1);
    setPageNumber((prev) => prev - 1);
  }

  function goToNextPage() {
    if (pageNumber >= numPages) return;
    setPageDirection(1);
    setPageNumber((prev) => prev + 1);
  }

  function zoomOut() {
    setScale((prev) => Math.max(0.5, parseFloat((prev - 0.25).toFixed(2))));
  }

  function zoomIn() {
    setScale((prev) => Math.min(3.0, parseFloat((prev + 0.25).toFixed(2))));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5"
        style={{
          background: "linear-gradient(180deg, rgba(37,99,235,0.07) 0%, rgba(37,99,235,0.03) 100%)",
          borderBottom: "1px solid rgba(37,99,235,0.1)",
        }}
      >
        {/* Brand mark */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-[18px] items-center justify-center rounded px-1.5 text-[9px] font-black tracking-widest text-white"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 1px 6px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            VG
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-interactive-primary">
            Valgate
          </span>
          <span className="hidden text-[11px] text-secondary sm:inline">· Agent Document</span>
        </div>

        {/* Page navigation pill */}
        <div
          className="flex items-center gap-0.5 rounded-full p-0.5"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.55)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1 || isLoading}
            className="flex size-11 sm:size-7 items-center justify-center rounded-full text-foreground/70 transition-all hover:bg-white hover:text-foreground disabled:opacity-25"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="min-w-[54px] text-center text-[11px] font-semibold tabular-nums text-foreground">
            {isLoading ? "—" : `${pageNumber} / ${numPages}`}
          </span>
          <button
            type="button"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || isLoading}
            className="flex size-11 sm:size-7 items-center justify-center rounded-full text-foreground/70 transition-all hover:bg-white hover:text-foreground disabled:opacity-25"
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* Zoom pill */}
        <div
          className="flex items-center gap-0.5 rounded-full p-0.5"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.55)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="flex size-11 sm:size-7 items-center justify-center rounded-full text-foreground/70 transition-all hover:bg-white hover:text-foreground disabled:opacity-25"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="min-w-[40px] text-center text-[11px] font-semibold tabular-nums text-foreground">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="flex size-11 sm:size-7 items-center justify-center rounded-full text-foreground/70 transition-all hover:bg-white hover:text-foreground disabled:opacity-25"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── Document area ────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto"
        style={{
          backgroundColor: "#111520",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Ambient glow behind page */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: `${pageWidth + 280}px`,
            height: "340px",
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.14) 0%, transparent 72%)",
          }}
          aria-hidden
        />

        <div className="flex w-full flex-col items-center gap-5 px-8 py-10">
          {loadError ? (
            <ErrorState message={loadError} />
          ) : (
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<DocumentSkeleton width={pageWidth} />}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pageNumber}
                  initial={{ opacity: 0, y: 18 * pageDirection }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 * pageDirection }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    borderRadius: "1px",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.06), 0 4px 14px rgba(0,0,0,0.35), 0 16px 40px rgba(0,0,0,0.45), 0 40px 80px rgba(0,0,0,0.28)",
                  }}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    width={pageWidth}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </motion.div>
              </AnimatePresence>

              {/* Page pip indicators — shown for multi-page docs up to 12 pages */}
              {!isLoading && numPages > 1 && numPages <= 12 && (
                <div className="mt-5 flex items-center justify-center gap-1.5">
                  {Array.from({ length: numPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPageDirection(i + 1 > pageNumber ? 1 : -1);
                        setPageNumber(i + 1);
                      }}
                      aria-label={`Go to page ${i + 1}`}
                      className="transition-all"
                      style={{
                        width: i + 1 === pageNumber ? "20px" : "6px",
                        height: "6px",
                        borderRadius: "3px",
                        background:
                          i + 1 === pageNumber
                            ? "rgba(37,99,235,0.7)"
                            : "rgba(255,255,255,0.2)",
                      }}
                    />
                  ))}
                </div>
              )}
            </Document>
          )}
        </div>

        {/* Corner watermark */}
        {!loadError && !isLoading && (
          <div
            className="pointer-events-none absolute bottom-4 right-5 flex items-center gap-1.5"
            style={{ opacity: 0.18 }}
            aria-hidden
          >
            <div
              className="flex h-3.5 items-center justify-center rounded px-1 text-[8px] font-black tracking-wider text-white"
              style={{ background: "rgba(255,255,255,0.25)" }}
            >
              VG
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[2px] text-white">
              Valgate
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */

function DocumentSkeleton({ width }: { width: number }) {
  return (
    <div
      style={{
        width: `${width}px`,
        minHeight: "880px",
        background: "#ffffff",
        borderRadius: "1px",
        padding: "52px 60px 60px",
        boxShadow:
          "0 4px 14px rgba(0,0,0,0.35), 0 16px 40px rgba(0,0,0,0.45), 0 40px 80px rgba(0,0,0,0.28)",
      }}
    >
      {/* Document header */}
      <div className="mb-7 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-1.5 w-16 animate-pulse rounded-sm bg-gray-100" />
          <div className="h-6 w-64 animate-pulse rounded-sm bg-gray-200" style={{ animationDelay: "0.05s" }} />
          <div className="h-3.5 w-40 animate-pulse rounded-sm bg-gray-100" style={{ animationDelay: "0.1s" }} />
        </div>
        <div className="h-10 w-10 animate-pulse rounded bg-gray-100" style={{ animationDelay: "0.08s" }} />
      </div>

      <div className="mb-7 h-px bg-gray-100" />

      {/* Body paragraph 1 */}
      <div className="mb-6 flex flex-col gap-2.5">
        {[100, 96, 92, 100, 88, 94, 100, 76].map((w, i) => (
          <div
            key={i}
            className="h-2.5 animate-pulse rounded-sm bg-gray-100"
            style={{ width: `${w}%`, animationDelay: `${0.05 * i}s` }}
          />
        ))}
      </div>

      {/* Section heading */}
      <div className="mb-4 h-4 w-36 animate-pulse rounded-sm bg-gray-150" style={{ animationDelay: "0.15s", background: "#e5e7eb" }} />

      {/* Body paragraph 2 */}
      <div className="mb-6 flex flex-col gap-2.5">
        {[94, 100, 88, 96, 82, 100, 90].map((w, i) => (
          <div
            key={i}
            className="h-2.5 animate-pulse rounded-sm bg-gray-100"
            style={{ width: `${w}%`, animationDelay: `${0.05 * i + 0.2}s` }}
          />
        ))}
      </div>

      {/* Signature block placeholder */}
      <div className="mt-10 flex items-end gap-10">
        <div className="flex flex-col gap-2">
          <div className="h-2 w-24 animate-pulse rounded-sm bg-gray-100" />
          <div className="h-px w-32 bg-gray-200" />
          <div className="h-2 w-20 animate-pulse rounded-sm bg-gray-100" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-2 w-24 animate-pulse rounded-sm bg-gray-100" />
          <div className="h-px w-32 bg-gray-200" />
          <div className="h-2 w-20 animate-pulse rounded-sm bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

/* ── Error state ──────────────────────────────────────────── */

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div
        className="flex size-16 items-center justify-center rounded-2xl"
        style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.2)",
          boxShadow: "0 0 24px rgba(239,68,68,0.08)",
        }}
      >
        <FileX className="size-7 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/80">{message}</p>
        <p className="mt-1 text-xs text-white/35">
          Try downloading the file directly from the footer.
        </p>
      </div>
    </div>
  );
}

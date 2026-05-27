"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import { FileText, X, ExternalLink, Download } from "lucide-react";
import type { AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";

const PDFViewer = dynamic(
  () => import("./PDFViewer").then((mod) => ({ default: mod.PDFViewer })),
  { ssr: false },
);
import {
  glassCloseButton,
  glassDocIcon,
  glassModalOverlay,
  glassModalPanel,
} from "./glass-styles";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  doc: AiWorkspaceDocument | null;
  onClose: () => void;
};

export function AIDocumentModal({ doc, onClose }: Props) {
  const isPdf = doc?.mimeType === "application/pdf";
  const isImage = doc?.mimeType?.startsWith("image/") ?? false;

  return (
    <DialogPrimitive.Root open={!!doc} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[60]"
          style={glassModalOverlay}
        />

        {/* Panel */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[60] flex -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl animate-[glass-open_0.35s_cubic-bezier(0.16,1,0.3,1)_both] focus:outline-none"
          style={{
            ...glassModalPanel,
            width: "min(90vw, 960px)",
            height: "85vh",
          }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 px-5 py-4">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={isPdf ? { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 2px 8px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.15)" } : glassDocIcon}
            >
              {isPdf ? (
                <span className="text-[11px] font-black tracking-wide text-white">VG</span>
              ) : (
                <FileText className="size-4 text-interactive-primary" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate font-display text-[15px] font-bold text-foreground">
                {doc?.name ?? "Document"}
              </DialogPrimitive.Title>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0">
                {doc?.category && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-status-success">
                    {doc.category}
                  </span>
                )}
                {doc?.category && doc?.sizeBytes != null && (
                  <span className="text-[10px] text-secondary">·</span>
                )}
                {doc?.sizeBytes != null && (
                  <span className="text-[10px] text-secondary">{formatBytes(doc.sizeBytes)}</span>
                )}
              </div>
              {doc?.description && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-secondary">
                  {doc.description}
                </p>
              )}
            </div>

            <DialogPrimitive.Close
              className="flex size-10 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
              style={glassCloseButton}
              aria-label="Close document viewer"
            >
              <X className="size-4 text-foreground" />
            </DialogPrimitive.Close>
          </div>

          <div className="ai-glass-divider-h mx-5" />

          {/* Content area */}
          <div className="relative min-h-0 flex-1 overflow-hidden p-4">
            {doc && isPdf && (
              <PDFViewer url={doc.href} title={doc.name} />
            )}

            {doc && isImage && (
              <div className="flex h-full w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.href}
                  alt={doc.name}
                  className="max-h-full max-w-full rounded-xl object-contain"
                />
              </div>
            )}

            {doc && !isPdf && !isImage && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div
                  className="flex size-16 items-center justify-center rounded-2xl"
                  style={glassDocIcon}
                >
                  <FileText className="size-8 text-interactive-primary" />
                </div>
                <div className="text-center">
                  <p className="font-display text-[15px] font-semibold text-foreground">
                    {doc.name}
                  </p>
                  <p className="mt-1 text-sm text-secondary">
                    {doc.sizeBytes != null ? formatBytes(doc.sizeBytes) : "File"}
                  </p>
                </div>
                <a
                  href={doc.href}
                  download={doc.name}
                  className="ai-glass-cta mt-2 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-interactive-primary-text transition-opacity hover:opacity-90"
                >
                  <Download className="size-4" />
                  Download File
                </a>
              </div>
            )}
          </div>

          <div className="ai-glass-divider-h mx-5" />

          {/* Footer — extra bottom inset so actions clear rounded modal corners */}
          <div
            className="flex shrink-0 items-center justify-between gap-4 px-6 pt-4"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}
          >
            <a
              href={doc?.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-medium text-secondary transition-colors hover:text-foreground"
              style={glassCloseButton}
            >
              <ExternalLink className="size-3.5" />
              Open in new tab
            </a>

            {doc && (
              <a
                href={doc.href}
                download={doc.name}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-interactive-primary transition-opacity hover:opacity-80"
                style={glassCloseButton}
              >
                <Download className="size-3.5" />
                Download
              </a>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

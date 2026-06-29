"use client";

import { FileText, Download, ExternalLink } from "lucide-react";

// Mirrors the same image extension set used in queries.ts for thumbnail generation.
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

// Determines the rendering strategy based on file extension and MIME type.
function getFileType(
  extension: string | undefined,
  mimeType: string | undefined,
): "image" | "pdf" | "other" {
  const ext = (extension ?? "").toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  return "other";
}

interface DocumentPreviewPaneProps {
  // The file name — used as alt text for images and the download filename.
  fileName: string;
  // The file extension — primary signal for choosing the preview strategy.
  extension?: string;
  // The MIME type — used as a secondary signal for PDF detection.
  mimeType?: string;
  // The signed URL to the file. Null while the URL is still being fetched from the server.
  fileUrl: string | null;
}

/**
 * Renders a preview of a document file.
 *
 * Rendering rules:
 * - Images: rendered with <img> and object-contain so the full image fits without cropping.
 * - PDFs: rendered in a native <iframe> using the browser's built-in PDF viewer.
 *   No external library (e.g. PDF.js) is used — zero added dependencies.
 * - All other types (spreadsheets, Word docs, etc.): shown with a Download button
 *   and an Open-in-new-tab link using the signed URL. Never a dead-end message.
 * - While fileUrl is null (URL is loading): a neutral skeleton is shown.
 */
export function DocumentPreviewPane({
  fileName,
  extension,
  mimeType,
  fileUrl,
}: DocumentPreviewPaneProps) {
  const fileType = getFileType(extension, mimeType);

  // Skeleton: displayed while the signed URL is still being fetched.
  if (fileUrl === null) {
    return (
      <div className="w-full min-h-[400px] bg-slate-100 rounded-xl animate-pulse" />
    );
  }

  // Image preview: full image visible with object-contain, no cropping.
  if (fileType === "image") {
    return (
      <div className="w-full min-h-[400px] bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  // PDF preview: native browser PDF viewer via <iframe>.
  // The browser's built-in viewer handles all rendering — no PDF.js required.
  if (fileType === "pdf") {
    return (
      <div className="w-full rounded-xl border border-slate-200 overflow-hidden" style={{ minHeight: 500 }}>
        <iframe
          src={fileUrl}
          title={fileName}
          className="w-full"
          style={{ height: 500, display: "block" }}
        />
      </div>
    );
  }

  // Fallback for spreadsheets, Word docs, and any other file type.
  // Offers a real Download action and an Open-in-new-tab link via the signed URL.
  // This is never a dead-end — the user always has a path to the file.
  return (
    <div className="w-full min-h-[400px] bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-5 p-8">
      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        <FileText className="w-6 h-6 text-slate-400" />
      </div>

      <div className="text-center">
        <p className="text-[14px] font-semibold text-[--val-heading]">
          Preview not available
        </p>
        <p className="text-[13px] text-slate-400 mt-1 max-w-[220px] text-center leading-relaxed">
          This file type can&apos;t be previewed in the browser. Download it or open it in a new tab.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Download: triggers the browser's native download for this file */}
        <a
          href={fileUrl}
          download={fileName}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-[13px] font-semibold text-[--val-heading]
            hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all duration-150"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          Download
        </a>

        {/* Open: opens the signed URL in a new browser tab */}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white
            hover:opacity-90 active:scale-[0.97] transition-all duration-150"
          style={{ background: "var(--val-primary-dark)" }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </a>
      </div>
    </div>
  );
}

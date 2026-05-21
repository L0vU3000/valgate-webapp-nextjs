"use client";

import { useState, useRef } from "react";
import { uploadDocument } from "@/lib/actions/documents.actions";
import { X, Upload, CheckCircle2 } from "lucide-react";
import {
  VerificationOverlay,
  type VerificationOverlayPhase,
} from "./VerificationOverlay";
import type { WizardConfig, ActionResult } from "./types";
import type { ZodTypeAny } from "zod";

type VerificationConfig = NonNullable<WizardConfig<ZodTypeAny>["verification"]>;

interface VerificationStepProps {
  propertyId: string;
  entityId: string;
  config: VerificationConfig;
  onBack: () => void;
  onComplete: () => void;
}

/** Minimum time the verifying loop plays so the animation is visible even on fast networks. */
const MIN_VERIFY_MS = 1800;

export function VerificationStep({
  propertyId,
  entityId,
  config,
  onBack,
  onComplete,
}: VerificationStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [declared, setDeclared] = useState(false);
  const [overlayPhase, setOverlayPhase] = useState<VerificationOverlayPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = overlayPhase !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const slotsLeft = config.maxFiles - files.length;
    const toAdd = selected.slice(0, slotsLeft);
    setFiles((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleVerify() {
    if (files.length < config.minFiles || !declared || isBusy) return;

    setOverlayPhase("verifying");
    setError(null);

    const docIds: string[] = [];
    const startedAt = Date.now();
    let failureMessage: string | null = null;

    try {
      // Upload sequentially to avoid nextId race conditions in _fs.ts
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadDocument(propertyId, fd);
        if (!result.ok) {
          failureMessage = `Failed to upload ${file.name}. Check your file and try again.`;
          break;
        }
        docIds.push(result.data.id);
      }

      if (!failureMessage) {
        const verifyResult: ActionResult<void> = await config.onVerify({
          entityId,
          docIds,
          propertyId,
        });

        if (!verifyResult.ok) {
          failureMessage = verifyResult.error;
        }
      }
    } catch {
      failureMessage = "Something went wrong during verification. Please try again.";
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_VERIFY_MS) {
      await new Promise((resolve) => window.setTimeout(resolve, MIN_VERIFY_MS - elapsed));
    }

    if (failureMessage) {
      setError(failureMessage);
      setOverlayPhase("error");
      return;
    }

    setOverlayPhase("success");
  }

  function handleOverlayErrorDismiss() {
    setOverlayPhase(null);
  }

  const canVerify = files.length >= config.minFiles && declared && !isBusy;

  // Only available in development — lets you skip past the file picker to test the
  // verification flow end-to-end without a real document.
  const isDev = process.env.NODE_ENV === "development";

  function handleAddDummyDoc() {
    // Build the smallest valid PDF in memory so uploadDocument doesn't choke on it.
    const minimalPdf =
      "%PDF-1.0\n" +
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n" +
      "xref\n0 4\n" +
      "0000000000 65535 f\n" +
      "0000000009 00000 n\n" +
      "0000000058 00000 n\n" +
      "0000000115 00000 n\n" +
      "trailer<</Size 4/Root 1 0 R>>\n" +
      "startxref\n190\n%%EOF";

    const blob = new Blob([minimalPdf], { type: "application/pdf" });
    const dummyFile = new File([blob], "dummy-document.pdf", {
      type: "application/pdf",
    });

    // Add the file only if there's still a slot available
    const slotsLeft = config.maxFiles - files.length;
    if (slotsLeft > 0) {
      setFiles((prev) => [...prev, dummyFile]);
    }

    // Auto-check the declaration so you can go straight to the Verify button
    setDeclared(true);
  }

  return (
    <div className="relative flex flex-col h-full">
      {overlayPhase && (
        <VerificationOverlay
          phase={overlayPhase}
          actionLabel={config.title}
          errorMessage={error ?? undefined}
          onSuccessComplete={onComplete}
          onErrorDismiss={handleOverlayErrorDismiss}
        />
      )}

      {/* Step header */}
      <div className="px-8 py-6 border-b border-slate-100">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-1">
          Verification
        </p>
        <h3 className="text-xl font-bold text-val-heading">{config.title}</h3>
        <p className="text-sm text-slate-500 mt-1">
          Upload a {config.documentLabel.toLowerCase()} as supporting evidence, then confirm the declaration below.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {error && !isBusy && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-red-700 leading-snug">Verification failed</p>
              <p className="text-[12px] text-red-600 mt-0.5 leading-snug">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-red-400 hover:text-red-600 transition-colors mt-0.5"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Drop / click zone */}
        <div
          onClick={() => !isBusy && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-slate-200 rounded-xl p-8 text-center transition-all duration-200 ${
            isBusy
              ? "opacity-50 pointer-events-none"
              : "cursor-pointer hover:border-[var(--val-primary-dark)] hover:bg-blue-50/30"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-val-heading">
            Click to upload {config.documentLabel}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDF, JPG, PNG · up to {config.maxFiles} file
            {config.maxFiles > 1 ? "s" : ""}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
          disabled={isBusy}
        />

        {/* DEV-only shortcut — never shown in production */}
        {isDev && (
          <button
            type="button"
            onClick={handleAddDummyDoc}
            disabled={files.length >= config.maxFiles || isBusy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150"
          >
            <span className="px-1.5 py-0.5 bg-amber-400 text-white rounded text-[10px] font-bold uppercase tracking-wide">
              DEV
            </span>
            Add dummy doc
          </button>
        )}

        {/* Staged files */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="flex-1 text-sm text-val-heading truncate">
                  {file.name}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={isBusy}
                  className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Declaration */}
        <label className={`flex items-start gap-3 select-none ${isBusy ? "opacity-50 pointer-events-none" : "cursor-pointer group"}`}>
          <input
            type="checkbox"
            checked={declared}
            onChange={(e) => setDeclared(e.target.checked)}
            disabled={isBusy}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-[var(--val-primary-dark)] shrink-0"
          />
          <span className="text-sm text-slate-600 group-hover:text-val-heading transition-colors leading-relaxed">
            {config.declaration}
          </span>
        </label>
      </div>

      {/* Footer */}
      <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          disabled={isBusy}
          className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150 shrink-0"
        >
          Back
        </button>
        <div className="flex flex-col items-end gap-1 min-w-0">
          {!canVerify && !isBusy && (
            <p className="text-[11px] text-slate-400 text-right">
              {files.length < config.minFiles && !declared
                ? `Upload a ${config.documentLabel.toLowerCase()} and confirm the declaration`
                : files.length < config.minFiles
                  ? `Upload at least ${config.minFiles} ${config.documentLabel.toLowerCase()}`
                  : "Confirm the declaration above to continue"}
            </p>
          )}
          <button
            onClick={handleVerify}
            disabled={!canVerify}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
            style={{
              background: "linear-gradient(168deg, #059669 0%, #10b981 100%)",
              boxShadow: "0 4px 6px -1px rgba(5,150,105,0.20)",
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {config.title}
          </button>
        </div>
      </div>
    </div>
  );
}

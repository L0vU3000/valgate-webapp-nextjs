"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Loader2, Sparkles, AlertCircle, RotateCw } from "lucide-react";
import type { Document as DbDocument } from "@/lib/data/types/document";
import type { SuggestedUpdate } from "@/lib/services/property-suggestions";
import { updateProperty } from "@/app/actions/properties";
import { DocumentPreviewPane, isPdfPreview } from "./DocumentPreviewPane";
import { formatBytes } from "@/lib/format";

// Maps a document's verifies.entityType to a display label and chip classes.
// Mirrors the ENTITY_TYPE_CHIP constant in PropertyDocumentsPage.tsx — kept in
// sync manually since it's defined locally in both files to avoid an abstraction
// for what is currently a two-consumer constant.
const ENTITY_TYPE_CHIP: Record<string, { label: string; cls: string }> = {
  "ownership-record":  { label: "Verifies Ownership",  cls: "bg-emerald-50 text-emerald-700" },
  "co-owner":          { label: "Verifies Co-owner",    cls: "bg-emerald-50 text-emerald-700" },
  "inspection":        { label: "Verifies Inspection",  cls: "bg-emerald-50 text-emerald-700" },
  "lease":             { label: "Verifies Lease",       cls: "bg-emerald-50 text-emerald-700" },
  "valuation":         { label: "Verifies Valuation",   cls: "bg-emerald-50 text-emerald-700" },
  "estate-plan":       { label: "Verifies Estate",      cls: "bg-emerald-50 text-emerald-700" },
  "location-identity": { label: "Verifies Location",    cls: "bg-emerald-50 text-emerald-700" },
  "financials":        { label: "Verifies Financials",  cls: "bg-emerald-50 text-emerald-700" },
  "rental":            { label: "Verifies Rental",      cls: "bg-emerald-50 text-emerald-700" },
};

interface DocumentDetailViewProps {
  // The full document object — all fields come from here; no mock data.
  document: DbDocument;
  // The signed URL for the document file. Null while the URL is still being fetched.
  fileUrl: string | null;
  // Called when the user clicks the back button or "All Documents" in the sidebar.
  onBack: () => void;
}

type Tab = "details" | "summary" | "translate";

/**
 * Two-pane document viewer.
 *
 * Layout:
 *  - Top toolbar: back button, file name, Download + Open action buttons.
 *  - Left pane: DocumentPreviewPane (image / PDF / fallback).
 *  - Right rail: Details tab (real schema fields) | Summary tab (empty state for Phase 2).
 *
 * No mock data. Every field shown in the Details tab traces to a real schema field.
 * Fields that are missing (undefined) are omitted — never fabricated.
 */
export function DocumentDetailView({ document: doc, fileUrl, onBack }: DocumentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  // Pre-compute formatted display values from the document object.
  const formattedDate = new Date(doc.uploadedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedSize = doc.sizeBytes ? formatBytes(doc.sizeBytes) : null;
  const extension = doc.extension ? doc.extension.toUpperCase() : null;

  // Combined file type + size label — e.g. "PDF · 2.4 MB".
  // Only rendered when at least one of the two values is available.
  const fileSizeLabel =
    extension && formattedSize
      ? `${extension} · ${formattedSize}`
      : extension
      ? extension
      : formattedSize
      ? formattedSize
      : null;

  // Verifies chip — only shown when the document has a verifies.entityType with a known chip.
  const verifiesChip = doc.verifies?.entityType
    ? (ENTITY_TYPE_CHIP[doc.verifies.entityType] ?? null)
    : null;

  return (
    <div className="flex-1 min-h-full bg-val-bg-page-alt flex flex-col">

      {/* Top toolbar: back control, file name, action buttons */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white">
        <div className="flex items-center gap-4 min-w-0">
          {/* Back button — returns to the documents browse view */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 shrink-0 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="text-xs font-semibold tracking-widest uppercase text-slate-400 group-hover:text-slate-600 transition-colors">
              Documents
            </span>
          </button>

          {/* Vertical divider */}
          <div className="w-px h-4 bg-slate-200 shrink-0" />

          {/* File name */}
          <span className="text-[14px] font-semibold text-[--val-heading] truncate">
            {doc.name}
          </span>
        </div>

        {/* Download and Open buttons — only rendered once the signed URL is available.
            While the URL is loading (fileUrl null), these slots are empty so the toolbar
            doesn't show disabled buttons that can't be interacted with. */}
        {fileUrl && (
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <a
              href={fileUrl}
              download={doc.name}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-[13px] font-semibold text-[--val-heading]
                hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all duration-150"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Download
            </a>
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
        )}
      </div>

      {/* Two-pane body: preview on the left, details rail on the right */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left pane: document preview. A PDF viewer is handed the whole box — no padding and no
            scroll — because a title document is unreadable inside a nested scroll area. Images
            and the fallback keep the padded, scrollable treatment. */}
        <div
          className={
            isPdfPreview(doc.extension, doc.mimeType)
              ? "flex-1 min-w-0 min-h-0 flex"
              : "flex-1 min-w-0 p-6 overflow-y-auto"
          }
        >
          <DocumentPreviewPane
            fileName={doc.name}
            extension={doc.extension}
            mimeType={doc.mimeType}
            fileUrl={fileUrl}
          />
        </div>

        {/* Right rail: Details and Summary tabs */}
        <div className="w-[280px] shrink-0 border-l border-slate-200/60 flex flex-col bg-white">

          {/* Tab bar */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-3 text-[13px] font-semibold border-b-2 transition-colors duration-150 ${
                activeTab === "details"
                  ? "border-[--val-primary-dark] text-[--val-primary-dark]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-3 text-[13px] font-semibold border-b-2 transition-colors duration-150 ${
                activeTab === "summary"
                  ? "border-[--val-primary-dark] text-[--val-primary-dark]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab("translate")}
              className={`flex-1 py-3 text-[13px] font-semibold border-b-2 transition-colors duration-150 ${
                activeTab === "translate"
                  ? "border-[--val-primary-dark] text-[--val-primary-dark]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Translate
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "details" && (
              <DetailsTab
                doc={doc}
                formattedDate={formattedDate}
                fileSizeLabel={fileSizeLabel}
                verifiesChip={verifiesChip}
              />
            )}
            {/* The property check is its own job, not a summary feature: it renders BESIDE the
                summary tab rather than inside it, so a document whose summary failed (or was never
                run) can still be read against the property. Inside SummaryTab it would have been
                unreachable in three of that component's four states. */}
            {activeTab === "summary" && (
              <div className="flex flex-col gap-6">
                <SummaryTab doc={doc} />
                <SuggestUpdates doc={doc} />
              </div>
            )}
            {activeTab === "translate" && <TranslateTab doc={doc} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Translate tab: the document's own text in English, on demand.
//
// Nothing is stored — the row is unchanged after translating — so this is a per-click model call
// on the same paid-model route and rate limit as the summary. The result lives in this component's
// state until the tab unmounts. Storing it on the row (like aiSummary) is the upgrade path once the
// column exists; until then a reload simply asks again.
function TranslateTab({ doc }: { doc: DbDocument }) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [translation, setTranslation] = useState<{ text: string; language: string } | null>(null);

  async function translate() {
    setIsTranslating(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/documents/${doc.id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "translate" }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const data = await response.json();
      if (data?.ok && typeof data.translation === "string") {
        setTranslation({ text: data.translation, language: String(data.detectedLanguage ?? "") });
      } else {
        setFailed(true);
      }
    } catch (error) {
      console.error("[TranslateTab] translate request failed:", error);
      setFailed(true);
    } finally {
      setIsTranslating(false);
    }
  }

  if (isTranslating) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-4 py-8">
        <Loader2 className="w-6 h-6 text-[--val-primary-dark] animate-spin" />
        <div>
          <p className="text-[15px] font-semibold text-[--val-heading] mb-1">Translating…</p>
          <p className="text-[13px] text-slate-400 leading-relaxed max-w-[180px] mx-auto">
            Reading the document and translating it into English.
          </p>
        </div>
      </div>
    );
  }

  if (translation) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Translation
            </p>
            {translation.language && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {translation.language} → English
              </span>
            )}
          </div>
          <p className="text-[13px] text-[--val-heading] leading-relaxed whitespace-pre-line">
            {translation.text}
          </p>
        </div>

        {/* Said plainly because it matters here: a mistranslated figure or name in a land document
            is a real-world error, and the original is one click away in the pane on the left. */}
        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
          Machine translation. Check names, numbers and land references against the original before
          relying on them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-4 py-8">
      <Sparkles className="w-6 h-6 text-[--val-primary-dark]" />
      <div>
        <p className="text-[15px] font-semibold text-[--val-heading] mb-1">
          {failed ? "Translation failed" : "Read it in English"}
        </p>
        <p className="text-[13px] text-slate-400 leading-relaxed max-w-[190px] mx-auto">
          {failed
            ? "The document could not be translated. Try again in a moment."
            : "Translates the text of this document. Nothing is saved to the document."}
        </p>
      </div>
      <button
        onClick={translate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white hover:opacity-90 active:scale-[0.97] transition-all duration-150"
        style={{ background: "var(--val-primary-dark)" }}
      >
        {failed ? <RotateCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        {failed ? "Try again" : "Translate to English"}
      </button>
    </div>
  );
}

// Details tab: real fields only from the document object.
// Each row is conditionally rendered — if the field is missing, the row is omitted.
// No fabricated values, no placeholder text.
function DetailsTab({
  doc,
  formattedDate,
  fileSizeLabel,
  verifiesChip,
}: {
  doc: DbDocument;
  formattedDate: string;
  fileSizeLabel: string | null;
  verifiesChip: { label: string; cls: string } | null;
}) {
  return (
    <dl className="flex flex-col gap-5">

      {/* Category — omitted when doc.category is not set */}
      {doc.category && (
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
            Category
          </dt>
          <dd className="text-[14px] font-medium text-[--val-heading]">
            {doc.category}
          </dd>
        </div>
      )}

      {/* File type and size — omitted when neither extension nor sizeBytes is set */}
      {fileSizeLabel && (
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
            File
          </dt>
          <dd className="text-[14px] font-medium text-[--val-heading]">
            {fileSizeLabel}
          </dd>
        </div>
      )}

      {/* Pages — the real page count from the AI summary. Omitted until a summary has run
          (Phase 1 had no real value here; there is no hardcoded placeholder anymore). */}
      {typeof doc.pageCount === "number" && (
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
            Pages
          </dt>
          <dd className="text-[14px] font-medium text-[--val-heading]">
            {doc.pageCount}
          </dd>
        </div>
      )}

      {/* Uploaded date — always available from the schema (non-optional) */}
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
          Uploaded
        </dt>
        <dd className="text-[14px] font-medium text-[--val-heading]">
          {formattedDate}
        </dd>
      </div>

      {/* Uploaded by — omitted when doc.uploadedBy is not set */}
      {doc.uploadedBy && (
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
            Uploaded by
          </dt>
          <dd className="text-[14px] font-medium text-[--val-heading]">
            {doc.uploadedBy}
          </dd>
        </div>
      )}

      {/* Verifies chip — omitted when the document has no verifies relationship */}
      {verifiesChip && (
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
            Verifies
          </dt>
          <dd>
            <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${verifiesChip.cls}`}>
              {verifiesChip.label}
            </span>
          </dd>
        </div>
      )}
    </dl>
  );
}

// Summary tab (Phase 2): real AI summary, generated on click and stored on the document row.
//
// Four states, driven by the document's persisted `aiStatus` plus a little local request state:
//   idle       → no summary yet: show the pitch + "Generate summary" button.
//   generating → the model is running (or the stored status is "generating"): show a spinner.
//   ready      → a stored summary exists: show the summary text + extracted key fields.
//   failed     → the last attempt errored: show a message + a "Retry" button.
//
// The generated result is STORED, so a page reload reads it from the row — the model never reruns
// on view. After a successful generation we call router.refresh() to re-fetch the server data so
// the stored summary appears without a manual reload.
function SummaryTab({ doc }: { doc: DbDocument }) {
  const router = useRouter();

  // Local request state, separate from the persisted doc.aiStatus:
  //  - isGenerating: true only while THIS click's request is in flight (instant spinner).
  //  - requestFailed: true if the request returned an error this session (instant failed state),
  //    so we don't depend on a refresh round-trip to show the error.
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  // Posts to the summarize route, then reflects the outcome. On success we refresh the server
  // data so the newly stored summary (now on the document row) renders.
  async function generate() {
    setIsGenerating(true);
    setRequestFailed(false);
    try {
      const response = await fetch(`/api/documents/${doc.id}/summarize`, { method: "POST" });
      if (!response.ok) {
        // The route already logged the real error server-side and set ai_status = "failed".
        setRequestFailed(true);
        return;
      }
      // Re-fetch the server component data so doc.aiSummary / aiKeyFields / pageCount appear.
      router.refresh();
    } catch (error) {
      // Network-level failure (the request never completed). Show the failed state.
      console.error("[SummaryTab] summarize request failed:", error);
      setRequestFailed(true);
    } finally {
      setIsGenerating(false);
    }
  }

  // Decide which of the four states to render.
  const showGenerating = isGenerating || doc.aiStatus === "generating";
  const showReady = !showGenerating && doc.aiStatus === "ready" && !!doc.aiSummary;
  const showFailed = !showGenerating && !showReady && (requestFailed || doc.aiStatus === "failed");

  // State: generating — spinner while the model reads the document.
  if (showGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-4 py-8">
        <Loader2 className="w-6 h-6 text-[--val-primary-dark] animate-spin" />
        <div>
          <p className="text-[15px] font-semibold text-[--val-heading] mb-1">
            Generating summary…
          </p>
          <p className="text-[13px] text-slate-400 leading-relaxed max-w-[180px] mx-auto">
            Reading the document and pulling out the key fields. This can take a moment.
          </p>
        </div>
      </div>
    );
  }

  // State: ready — the stored summary text plus the extracted key fields.
  if (showReady) {
    const keyFields = doc.aiKeyFields ?? [];
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">
            Summary
          </p>
          <p className="text-[13px] text-[--val-heading] leading-relaxed whitespace-pre-line">
            {doc.aiSummary}
          </p>
        </div>

        {/* Key fields — only rendered when the model extracted at least one. */}
        {keyFields.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">
              Key fields
            </p>
            <dl className="flex flex-col gap-3">
              {keyFields.map((field, index) => (
                <div key={`${field.label}-${index}`} className="flex flex-col gap-0.5">
                  <dt className="text-[12px] text-slate-400">{field.label}</dt>
                  <dd className="text-[13px] font-medium text-[--val-heading] break-words">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    );
  }

  // State: failed — a message and a Retry button that re-runs the same request.
  if (showFailed) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-4 py-8">
        <AlertCircle className="w-6 h-6 text-rose-500" />
        <div>
          <p className="text-[15px] font-semibold text-[--val-heading] mb-1">
            Couldn&apos;t generate summary
          </p>
          <p className="text-[13px] text-slate-400 leading-relaxed max-w-[180px] mx-auto">
            Something went wrong while reading this document. You can try again.
          </p>
        </div>
        <button
          onClick={generate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white
            hover:opacity-90 active:scale-[0.97] transition-all duration-150"
          style={{ background: "var(--val-primary-dark)" }}
        >
          <RotateCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  // State: idle — no summary yet. Offer to generate one.
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-4 py-8">
      <div>
        <p className="text-[15px] font-semibold text-[--val-heading] mb-1">
          No summary yet
        </p>
        <p className="text-[13px] text-slate-400 leading-relaxed max-w-[180px] mx-auto">
          Generate an AI summary to get a quick overview of this document&apos;s contents.
        </p>
      </div>
      <button
        onClick={generate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white
          hover:opacity-90 active:scale-[0.97] transition-all duration-150"
        style={{ background: "var(--val-primary-dark)" }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate summary
      </button>
    </div>
  );
}

// Suggested updates: the same file read again, this time with the property's own schema, and the
// differences between the two reported — "the deed says 4 bedrooms, the property says 3".
//
// The comparison itself is server-side and pure (lib/services/property-suggestions.ts): the only
// thing the model does is read the document, which is why what it suggests can be unit-tested.
//
// On demand, and nothing is stored. This is a QUESTION, not state: the user asked to see the
// differences, decides each one, and the card is gone on the next visit. Storing the suggestions
// would mean storing their dismissal too, and a prompt that comes back after being declined is
// worse than no prompt.
//
// Accepting writes through the property update action, so ownership, authorization and field
// validation are the ones that already exist — there is no second way to change a property.
function SuggestUpdates({ doc }: { doc: DbDocument }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedUpdate[] | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setChecking(true);
    setFailed(false);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${doc.id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suggest" }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const data = (await response.json()) as { suggestions?: SuggestedUpdate[] };
      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      console.error("[SuggestUpdates] suggest request failed:", err);
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }

  async function accept(suggestion: SuggestedUpdate) {
    setApplying(suggestion.field);
    setError(null);
    // One field, one patch: the action validates and authorizes it exactly as it does for a manual
    // edit, so a suggestion can never write something the user could not have typed themselves.
    const result = await updateProperty(doc.propertyId, { [suggestion.field]: suggestion.next });
    setApplying(null);
    if (!result.ok) {
      setError(result.error ?? "Couldn't save that change.");
      return;
    }
    setApplied((prev) => [...prev, suggestion.field]);
    // The property's own panels are server-rendered from the row we just changed.
    router.refresh();
  }

  const idle = suggestions === null && !checking && !failed;

  return (
    <div className="pt-5 border-t border-slate-100">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Suggested updates
        </p>
        {!checking && (
          <button
            onClick={check}
            className="text-[12px] font-semibold text-[--val-primary-dark] underline-offset-2 hover:underline"
          >
            {suggestions === null ? "Check this document" : "Check again"}
          </button>
        )}
      </div>

      {idle && (
        <p className="text-[12px] text-slate-400 leading-relaxed">
          Read this document against the property and see where the two disagree. Nothing changes
          until you accept it.
        </p>
      )}

      {checking && (
        <p className="flex items-center gap-2 text-[12px] text-slate-400" role="status" aria-live="polite">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Reading the document…
        </p>
      )}

      {failed && (
        <p className="text-[12px] text-rose-600" role="alert">
          Couldn&apos;t read this document just now. Try again.
        </p>
      )}

      {error && (
        <p className="text-[12px] text-rose-600" role="alert">
          {error}
        </p>
      )}

      {suggestions?.length === 0 && !checking && (
        <p className="text-[12px] text-slate-400 leading-relaxed">
          Nothing to change — this document agrees with the property.
        </p>
      )}

      {suggestions?.map((suggestion) => (
        <div
          key={suggestion.field}
          className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0"
        >
          <div className="min-w-0">
            <p className="text-[12px] text-slate-400">{suggestion.label}</p>
            <p className="text-[13px] text-[--val-heading] break-words">
              {/* The old value stays visible, struck through: the user is choosing between two
                  specific things, not approving a surprise. */}
              {suggestion.current && (
                <span className="text-slate-400 line-through mr-1.5">{suggestion.current}</span>
              )}
              <span className="font-medium">{suggestion.suggested}</span>
            </p>
          </div>
          <button
            onClick={() => accept(suggestion)}
            disabled={applying !== null || applied.includes(suggestion.field)}
            className="shrink-0 px-3 py-1.5 rounded-md text-[12px] font-semibold text-white
              hover:opacity-90 active:scale-[0.97] transition-all duration-150
              disabled:opacity-50 disabled:active:scale-100"
            style={{ background: "var(--val-primary-dark)" }}
          >
            {applied.includes(suggestion.field)
              ? "Saved"
              : applying === suggestion.field
                ? "Saving…"
                : "Use this"}
          </button>
        </div>
      ))}

      {applied.length > 0 && (
        <p className="mt-2 text-[12px] text-slate-400">
          Saved {applied.length} {applied.length === 1 ? "change" : "changes"} to the property.
        </p>
      )}
    </div>
  );
}

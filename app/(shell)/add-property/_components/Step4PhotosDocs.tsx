"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Upload,
  MoreVertical,
  FileText,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  RefreshCw,
  Star,
  Download,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { FormData } from "./types";
import { DevFileButton } from "@/components/dev/DevFileButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const easeOut: [number, number, number, number] = [0.25, 1, 0.5, 1];

function getDocMeta(filename: string): { bg: string; text: string; label: string } {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { bg: "bg-[#ffdad6]", text: "text-[#ba1a1a]", label: "PDF" };
  if (ext === "docx" || ext === "doc") return { bg: "bg-[#dbe1ff]", text: "text-[#2563eb]", label: "Word" };
  if (ext === "xlsx" || ext === "xls") return { bg: "bg-[#d7f5e3]", text: "text-[#1b6b3a]", label: "Excel" };
  return { bg: "bg-muted", text: "text-muted-foreground", label: (ext ?? "File").toUpperCase() };
}

export function Step4PhotosDocs({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  // Shared replace inputs — one per section. replaceIndex refs track which slot is being replaced.
  const photoReplaceInputRef = useRef<HTMLInputElement>(null);
  const docReplaceInputRef = useRef<HTMLInputElement>(null);
  const replacePhotoIndexRef = useRef<number>(-1);
  const replaceDocIndexRef = useRef<number>(-1);

  const [photosDragging, setPhotosDragging] = useState(false);
  const [docsDragging, setDocsDragging] = useState(false);
  // Preview URLs are created immediately in handlers (not via useEffect) so images show on the
  // same render as the file being added — no effect-delay grey flash. A ref tracks all live URLs
  // for the unmount cleanup revocation; individual removes revoke immediately.
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = photoPreviewUrls;
  // null = lightbox closed; number = index of photo currently shown
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Document viewer: null = closed; number = index of the document being shown.
  const [docViewerIndex, setDocViewerIndex] = useState<number | null>(null);
  // The object URL for the document currently in the viewer. Created when the
  // viewer opens and revoked when it closes, so the blob URL is never leaked.
  const [docViewerUrl, setDocViewerUrl] = useState<string | null>(null);
  // Convenience values for the open document (empty/false when the viewer is closed).
  const openDocName = docViewerIndex !== null ? form.documents[docViewerIndex] : "";
  const openDocIsPdf = openDocName.toLowerCase().endsWith(".pdf");
  // Track body mount so createPortal works correctly in SSR builds
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => () => { previewUrlsRef.current.forEach(URL.revokeObjectURL); }, []);

  // Rebuild photo preview URLs on mount. Navigating between wizard steps unmounts
  // this component, which destroys the local preview-URL state, but the photo blobs
  // still live in the parent form (form.photoFiles) and survive navigation. Recreate
  // the object URLs from those blobs so photos keep their previews when you come back.
  // A real page refresh clears form.photoFiles entirely, so this no-ops and the step
  // returns empty — the intended "uploads reset on refresh" behaviour.
  useEffect(() => {
    const files = form.photoFiles ?? [];
    if (files.length === 0) return;
    setPhotoPreviewUrls(files.map((f) => URL.createObjectURL(f)));
    // Run once on mount; the unmount cleanup above revokes whatever URLs are live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the document viewer on Escape while it is open.
  useEffect(() => {
    if (docViewerIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDocViewer();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docViewerIndex]);

  // Append preview URLs for newly added files. Called by both the file-input handler and the drop handler.
  const addPhotoFiles = useCallback(
    (files: File[]) => {
      const newUrls = files.map((f) => URL.createObjectURL(f));
      setPhotoPreviewUrls((prev) => [...prev, ...newUrls]);
      setForm({
        ...form,
        photos: [...form.photos, ...files.map((f) => f.name)],
        photoFiles: [...(form.photoFiles ?? []), ...files],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, setForm],
  );

  // ponytail: photos[] (display names) and photoFiles[] (blobs) are kept index-aligned for
  // freshly-added files. Resumed drafts/demo restore names with no blob, so a mixed list can
  // misalign on remove — acceptable: those restored files can't be uploaded anyway. Fix by
  // switching to a single {name, file?}[] array if/when draft file-resume is added.
  function removePhoto(i: number) {
    setPhotoPreviewUrls((prev) => {
      const url = prev[i];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, j) => j !== i);
    });
    setForm({
      ...form,
      photos: form.photos.filter((_, j) => j !== i),
      photoFiles: (form.photoFiles ?? []).filter((_, j) => j !== i),
    });
    // Keep lightbox index consistent after deletion
    if (lightboxIndex === i) {
      setLightboxIndex(null);
    } else if (lightboxIndex !== null && lightboxIndex > i) {
      setLightboxIndex(lightboxIndex - 1);
    }
  }

  function setAsCover(i: number) {
    if (i === 0) return;
    const photos = [...form.photos];
    const photoFiles = [...(form.photoFiles ?? [])];
    const urls = [...photoPreviewUrls];
    photos.unshift(photos.splice(i, 1)[0]);
    photoFiles.unshift(photoFiles.splice(i, 1)[0]);
    urls.unshift(urls.splice(i, 1)[0]);
    setPhotoPreviewUrls(urls);
    setForm({ ...form, photos, photoFiles });
    if (lightboxIndex === i) {
      setLightboxIndex(0);
    } else if (lightboxIndex !== null && lightboxIndex < i) {
      setLightboxIndex(lightboxIndex + 1);
    }
  }

  function replacePhoto(i: number) {
    replacePhotoIndexRef.current = i;
    photoReplaceInputRef.current?.click();
  }

  function handlePhotoReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = replacePhotoIndexRef.current;
    if (idx < 0) return;
    const newUrl = URL.createObjectURL(file);
    setPhotoPreviewUrls((prev) => {
      const next = [...prev];
      if (next[idx]) URL.revokeObjectURL(next[idx]);
      next[idx] = newUrl;
      return next;
    });
    const photos = [...form.photos];
    photos[idx] = file.name;
    const photoFiles = [...(form.photoFiles ?? [])];
    photoFiles[idx] = file;
    setForm({ ...form, photos, photoFiles });
    e.target.value = "";
  }

  function removeDoc(i: number) {
    // If the document being deleted is the one open in the viewer, close it first.
    if (docViewerIndex === i) {
      closeDocViewer();
    }
    setForm({
      ...form,
      documents: form.documents.filter((_, j) => j !== i),
      documentFiles: (form.documentFiles ?? []).filter((_, j) => j !== i),
    });
  }

  function replaceDoc(i: number) {
    replaceDocIndexRef.current = i;
    docReplaceInputRef.current?.click();
  }

  function handleDocReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = replaceDocIndexRef.current;
    if (idx < 0) return;
    const documents = [...form.documents];
    documents[idx] = file.name;
    const documentFiles = [...(form.documentFiles ?? [])];
    documentFiles[idx] = file;
    setForm({ ...form, documents, documentFiles });
    // If the replaced document is open in the viewer, reopen it with the new
    // blob so the iframe refreshes to show the new file.
    if (docViewerIndex === idx) {
      if (docViewerUrl) URL.revokeObjectURL(docViewerUrl);
      const newUrl = URL.createObjectURL(file);
      setDocViewerUrl(newUrl);
    }
    e.target.value = "";
  }

  // Opens the in-app viewer for document `i`. Does nothing for restored draft
  // rows that have no uploaded file blob (those can't be previewed).
  function openDocViewer(i: number) {
    const file = (form.documentFiles ?? [])[i];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDocViewerUrl(url);
    setDocViewerIndex(i);
  }

  // Closes the viewer and frees the object URL.
  function closeDocViewer() {
    if (docViewerUrl) URL.revokeObjectURL(docViewerUrl);
    setDocViewerUrl(null);
    setDocViewerIndex(null);
  }

  // The "Preview" menu item and a row click both route here now.
  function previewDoc(i: number) {
    openDocViewer(i);
  }

  // Still available as a button inside the viewer for users who want the
  // browser's own full tab (and the only view path for Word/Excel files).
  function openDocInNewTab() {
    if (!docViewerUrl) return;
    window.open(docViewerUrl, "_blank");
  }

  // Downloads the open document using its object URL. The `download` attribute
  // names the saved file after the real document name.
  function downloadDoc() {
    if (!docViewerUrl) return;
    const link = document.createElement("a");
    link.href = docViewerUrl;
    link.download = openDocName;
    link.click();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    addPhotoFiles(files);
    e.target.value = "";
  }

  function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setForm({
      ...form,
      documents: [...form.documents, ...files.map((f) => f.name)],
      documentFiles: [...(form.documentFiles ?? []), ...files],
    });
    e.target.value = "";
  }

  function handlePhotoDrop(e: React.DragEvent) {
    e.preventDefault();
    setPhotosDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    addPhotoFiles(files);
  }

  function handleDocDrop(e: React.DragEvent) {
    e.preventDefault();
    setDocsDragging(false);
    const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const extension = "." + f.name.split(".").pop()?.toLowerCase();
      return allowedExtensions.includes(extension);
    });
    if (files.length === 0) return;
    setForm({
      ...form,
      documents: [...form.documents, ...files.map((f) => f.name)],
      documentFiles: [...(form.documentFiles ?? []), ...files],
    });
  }

  function handleAddDummyPhoto() {
    setForm({ ...form, photos: [...form.photos, "dummy-photo.jpg"] });
  }

  function handleAddDummyDoc() {
    setForm({ ...form, documents: [...form.documents, "dummy-document.pdf"] });
  }

  const totalPhotos = form.photos.length;

  function lightboxPrev() {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + totalPhotos) % totalPhotos);
  }

  function lightboxNext() {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % totalPhotos);
  }

  return (
    <>
      {/* ─── Photo lightbox (portal to body so overflow-hidden parents don't clip it) ── */}
      {isMounted && createPortal(
        <AnimatePresence>
          {lightboxIndex !== null && (
            <motion.div
              key="lightbox-backdrop"
              className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setLightboxIndex(null)}
            >
              {/* Close */}
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Counter */}
              {totalPhotos > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 rounded-full px-3 py-1 text-sm text-white/80 tabular-nums pointer-events-none">
                  {lightboxIndex + 1} / {totalPhotos}
                </div>
              )}

              {/* Prev */}
              {totalPhotos > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                  className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}

              {/* Image — stopPropagation lives on the image itself so clicking the empty
                  space around it falls through to the backdrop and closes the lightbox. */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: easeOut }}
                  className="flex items-center justify-center px-16 sm:px-20 w-full h-full"
                >
                  {photoPreviewUrls[lightboxIndex] ? (
                    <img
                      src={photoPreviewUrls[lightboxIndex]}
                      alt={form.photos[lightboxIndex]}
                      draggable={false}
                      onClick={(e) => e.stopPropagation()}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
                    />
                  ) : (
                    <div className="w-72 h-72 bg-white/10 rounded-xl flex flex-col items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <ImageIcon className="w-12 h-12 text-white/40" />
                      <p className="text-white/60 text-sm text-center px-4">{form.photos[lightboxIndex]}</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Next */}
              {totalPhotos > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                  className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}

              {/* File name caption */}
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none">
                {form.photos[lightboxIndex]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Document viewer (portal to body, same shell as the photo lightbox) ── */}
      {isMounted && createPortal(
        <AnimatePresence>
          {docViewerIndex !== null && (
            <motion.div
              key="doc-viewer"
              className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeDocViewer}
            >
              {/* Header: type pill + filename, then Download / Open in new tab / Close.
                  No container stopPropagation — clicking empty header space falls through
                  to the backdrop and closes. Only the action buttons stop propagation so
                  they run their action without also closing. */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="bg-white/15 text-white text-xs font-semibold rounded-full px-2.5 py-1 shrink-0">
                  {getDocMeta(openDocName).label}
                </span>
                <p className="text-white font-medium truncate flex-1">{openDocName}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); downloadDoc(); }}
                  aria-label="Download"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openDocInNewTab(); }}
                  className="text-white/80 hover:text-white px-2 py-1 text-sm whitespace-nowrap transition-colors"
                >
                  Open in new tab
                </button>
                <button
                  type="button"
                  onClick={closeDocViewer}
                  aria-label="Close"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Body: inline PDF, or a fallback card for file types the browser can't render.
                  stopPropagation lives on the doc itself (iframe / card), so clicking the
                  empty space around it falls through to the backdrop and closes the viewer. */}
              <div className="flex-1 min-h-0 flex items-center justify-center px-6 pb-8">
                {openDocIsPdf && docViewerUrl ? (
                  <iframe
                    src={docViewerUrl}
                    title={openDocName}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-full max-w-[900px] rounded-xl bg-white shadow-2xl"
                  />
                ) : (
                  <div
                    className="flex flex-col items-center gap-4 text-center max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={`${getDocMeta(openDocName).bg} w-14 h-14 rounded-full flex items-center justify-center`}>
                      <FileText className={`w-7 h-7 ${getDocMeta(openDocName).text}`} />
                    </div>
                    <p className="text-white font-medium">Preview isn&apos;t available for this file type</p>
                    <p className="text-white/60 text-sm">Open it in a new tab or download to view the full document.</p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={openDocInNewTab}
                        className="bg-white text-[#1a1c1c] rounded-full px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-colors"
                      >
                        Open in new tab
                      </button>
                      <button
                        type="button"
                        onClick={downloadDoc}
                        className="border border-white/30 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col w-full max-w-[760px] mx-auto pb-8">
        {/* Header */}
        <motion.div
          className="flex flex-col gap-[11px] items-center w-full mb-10 shrink-0"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut }}
        >
          <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
            Add photos and documents
          </h2>
          <motion.p
            className="text-[16px] text-[#5b5f62] text-center leading-[1.43]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOut, delay: 0.08 }}
          >
            Add photos to your property record and attach key ownership documents.
          </motion.p>
        </motion.div>

        <div className="flex flex-col gap-12">
          {/* ─── Photos section ─────────────────────────────────────────── */}
          <motion.div
            className={`relative border rounded-2xl p-4 sm:p-6 w-full transition-colors duration-150 ${photosDragging ? "border-primary bg-blue-50/60" : "border-border"}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut, delay: 0.15 }}
            onDragOver={(e) => { e.preventDefault(); setPhotosDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setPhotosDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPhotosDragging(false); }}
            onDrop={handlePhotoDrop}
          >
            {/* Drop overlay shown when dragging over a filled photo grid */}
            {photosDragging && form.photos.length > 0 && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-blue-50/80 border-2 border-primary border-dashed flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-primary">Drop photos here</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[22px] font-semibold text-[#1a1c1c]">Photos</h2>
              <motion.button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-1 text-base font-semibold text-[#2563eb] underline decoration-transparent hover:decoration-[#2563eb] transition-[text-decoration-color] duration-200"
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.15 }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add more
              </motion.button>
              {/* Add input */}
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
              {/* Replace input — shared, slot index stored in replacePhotoIndexRef */}
              <input ref={photoReplaceInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoReplace} />
            </div>

            <div className="mb-4">
              <DevFileButton label="Add dummy photo" onClick={handleAddDummyPhoto} />
            </div>

            {form.photos.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                <AnimatePresence>
                  {form.photos.map((photo, i) => (
                    <motion.div
                      key={photo + i}
                      className="relative overflow-hidden rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.02),0px_2px_6px_0px_rgba(0,0,0,0.04),0px_4px_8px_0px_rgba(0,0,0,0.1)] group"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.3, ease: easeOut, delay: i * 0.05 }}
                    >
                      {/* Clickable image — opens lightbox */}
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        className="w-full block aspect-square sm:aspect-auto sm:h-[156px] relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Preview ${photo}`}
                      >
                        {photoPreviewUrls[i] ? (
                          <>
                            <img
                              src={photoPreviewUrls[i]}
                              alt={photo}
                              draggable={false}
                              className="w-full h-full object-cover"
                            />
                            {/* Hover scrim + eye icon */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3">
                            <ImageIcon className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                            <span className="text-xs text-muted-foreground/60 truncate w-full text-center">{photo}</span>
                          </div>
                        )}
                      </button>

                      {/* Cover badge */}
                      {i === 0 && (
                        <motion.div
                          className="absolute top-2 left-2 bg-white rounded-[14px] px-3 py-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] pointer-events-none"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25, ease: easeOut, delay: 0.15 }}
                        >
                          <span className="text-xs font-semibold text-[#1a1c1c]">Cover</span>
                        </motion.div>
                      )}

                      {/* Action menu — replaces the old X remove button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <motion.button
                            type="button"
                            className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shadow-sm focus-visible:opacity-100"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.88 }}
                            transition={{ duration: 0.12 }}
                            aria-label="Photo options"
                          >
                            <MoreVertical className="w-3 h-3 text-[#1a1c1c]" />
                          </motion.button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => setLightboxIndex(i)}>
                            <Eye className="w-4 h-4" />
                            Preview
                          </DropdownMenuItem>
                          {i !== 0 && (
                            <DropdownMenuItem onSelect={() => setAsCover(i)}>
                              <Star className="w-4 h-4" />
                              Set as cover
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => replacePhoto(i)}>
                            <RefreshCw className="w-4 h-4" />
                            Replace
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => removePhoto(i)}
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-2 transition-colors ${photosDragging ? "border-primary bg-blue-50/40" : "border-border hover:border-primary"}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.2, ease: easeOut }}
              >
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center group/icon transition-colors ${photosDragging ? "bg-primary" : "bg-muted"}`}
                  whileHover={{ scale: 1.12, backgroundColor: "#2563eb" }}
                  transition={{ duration: 0.2, ease: easeOut }}
                >
                  <Plus className={`w-6 h-6 transition-colors duration-200 ${photosDragging ? "text-white" : "text-muted-foreground group-hover/icon:text-white"}`} />
                </motion.div>
                <p className="text-sm font-medium text-[#1a1c1c]">{photosDragging ? "Drop photos here" : "Add photos"}</p>
                <p className="text-xs text-[#5b5f62]">Drag & drop or click to browse</p>
              </motion.button>
            )}
          </motion.div>

          {/* ─── Documents section ──────────────────────────────────────── */}
          <motion.div
            className={`relative border rounded-2xl p-4 sm:p-6 w-full transition-colors duration-150 ${docsDragging ? "border-primary bg-blue-50/60" : "border-border"}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut, delay: 0.3 }}
            onDragOver={(e) => { e.preventDefault(); setDocsDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDocsDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDocsDragging(false); }}
            onDrop={handleDocDrop}
          >
            {/* Drop overlay shown when dragging over a filled document list */}
            {docsDragging && form.documents.length > 0 && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-blue-50/80 border-2 border-primary border-dashed flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-primary">Drop documents here</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[22px] font-semibold text-[#1a1c1c]">Documents</h2>
              <motion.button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex items-center gap-1 text-base font-semibold text-[#2563eb] underline decoration-transparent hover:decoration-[#2563eb] transition-[text-decoration-color] duration-200"
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.15 }}
              >
                <Upload className="w-4 h-4" />
                Upload
              </motion.button>
              {/* Add input */}
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" onChange={handleDocChange} />
              {/* Replace input — shared, slot index stored in replaceDocIndexRef */}
              <input ref={docReplaceInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleDocReplace} />
            </div>

            <div className="mb-4">
              <DevFileButton label="Add dummy doc" onClick={handleAddDummyDoc} />
            </div>

            {form.documents.length > 0 ? (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {form.documents.map((doc, i) => {
                    const meta = getDocMeta(doc);
                    const hasBlob = !!(form.documentFiles ?? [])[i];
                    return (
                      <motion.div
                        key={doc + i}
                        className="border border-[#c3c6d7] rounded-xl flex items-center justify-between px-[17px] py-[17px]"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 14, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.32, ease: easeOut, delay: i * 0.06 }}
                        whileHover={{ backgroundColor: "rgba(0,0,0,0.015)" }}
                      >
                        {/* Clickable file info — opens the in-app viewer when a blob exists.
                            Restored-draft rows (no blob) are not clickable. */}
                        <button
                          type="button"
                          onClick={() => hasBlob && openDocViewer(i)}
                          disabled={!hasBlob}
                          aria-label={hasBlob ? `Preview ${doc}` : doc}
                          className={`group/doc flex items-center gap-4 flex-1 min-w-0 text-left ${hasBlob ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <motion.div
                            className={`${meta.bg} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.28, ease: easeOut, delay: i * 0.06 + 0.08 }}
                          >
                            <FileText className={`w-5 h-5 ${meta.text}`} />
                          </motion.div>
                          <div className="min-w-0">
                            <p className="text-base font-medium text-[#1a1c1c] leading-5 truncate">{doc}</p>
                            <p className="text-sm text-[#5b5f62] leading-[21px]">{meta.label}</p>
                          </div>
                          {/* Hover-only eye affordance, shown only when the row is previewable */}
                          {hasBlob && (
                            <Eye className="w-4 h-4 text-[#2563eb] opacity-0 [@media(hover:hover)]:group-hover/doc:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>

                        {/* Document action menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.button
                              type="button"
                              className="rounded-full p-2 hover:bg-muted transition-colors"
                              whileHover={{ scale: 1.12 }}
                              whileTap={{ scale: 0.88 }}
                              transition={{ duration: 0.12 }}
                              aria-label="Document options"
                            >
                              <MoreVertical className="w-4 h-4 text-[#5b5f62]" />
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {hasBlob && (
                              <DropdownMenuItem onSelect={() => previewDoc(i)}>
                                <Eye className="w-4 h-4" />
                                Preview
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => replaceDoc(i)}>
                              <RefreshCw className="w-4 h-4" />
                              Replace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => removeDoc(i)}
                              variant="destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-2 transition-colors ${docsDragging ? "border-primary bg-blue-50/40" : "border-border hover:border-primary"}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.2, ease: easeOut }}
              >
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center group/icon transition-colors ${docsDragging ? "bg-primary" : "bg-muted"}`}
                  whileHover={{ scale: 1.12, backgroundColor: "#2563eb" }}
                  transition={{ duration: 0.2, ease: easeOut }}
                >
                  <Upload className={`w-6 h-6 transition-colors duration-200 ${docsDragging ? "text-white" : "text-muted-foreground group-hover/icon:text-white"}`} />
                </motion.div>
                <p className="text-sm font-medium text-[#1a1c1c]">{docsDragging ? "Drop documents here" : "Upload documents"}</p>
                <p className="text-xs text-[#5b5f62]">PDF, Word, Excel accepted</p>
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
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
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/utils";
import type { FormData, StagedFileRef } from "./types";
import {
  uploadDraftFileAction,
  removeDraftFileAction,
  getDraftFileUrlAction,
} from "@/app/actions/property-drafts";
import { MAX_BYTES, ALLOWED_DOC_EXT, isHeic } from "@/lib/upload-constants";
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

async function uploadAndStage(
  draftId: string,
  file: File,
  kind: "photo" | "document",
): Promise<StagedFileRef> {
  const fd = new globalThis.FormData();
  fd.append("file", file);
  const res = await uploadDraftFileAction(draftId, kind, fd);
  if (!res.ok) throw new Error(res.error);
  return {
    id: res.data.id,
    name: res.data.name,
    mimeType: res.data.mimeType,
    sizeBytes: res.data.sizeBytes,
  };
}

async function processImageForUpload(file: File): Promise<File> {
  let workingFile: File = file;
  let outputName: string = file.name;

  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
    outputName = nameWithoutExt + ".jpg";
    workingFile = new File([blob], outputName, { type: "image/jpeg" });
  }

  const imageCompression = (await import("browser-image-compression")).default;
  const compressed = await imageCompression(workingFile, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2000,
    useWebWorker: false,
    fileType: "image/jpeg",
  });

  return new File([compressed], outputName, { type: "image/jpeg" });
}

export function Step4PhotosDocs({
  form,
  setForm,
  draftId,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  draftId: string | null;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoReplaceInputRef = useRef<HTMLInputElement>(null);
  const docReplaceInputRef = useRef<HTMLInputElement>(null);
  const replacePhotoIndexRef = useRef<number>(-1);
  const replaceDocIndexRef = useRef<number>(-1);

  const [photosDragging, setPhotosDragging] = useState(false);
  const [docsDragging, setDocsDragging] = useState(false);
  // Drag-to-reorder photo grid state
  const [dragPhotoIndex, setDragPhotoIndex] = useState<number | null>(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState<number | null>(null);

  const [urlById, setUrlById] = useState<Record<string, string>>({});
  const urlByIdRef = useRef<Record<string, string>>({});
  urlByIdRef.current = urlById;

  const formRef = useRef<FormData>(form);
  formRef.current = form;

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [docViewerIndex, setDocViewerIndex] = useState<number | null>(null);
  const [docViewerUrl, setDocViewerUrl] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const stagedPhotos = form.stagedPhotos ?? [];
  const stagedDocuments = form.stagedDocuments ?? [];

  const canStage = !!draftId && draftId.startsWith("DRFT-");

  function revokeIfBlob(url: string | undefined): void {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  useEffect(() => () => {
    Object.values(urlByIdRef.current).forEach(revokeIfBlob);
  }, []);

  useEffect(() => {
    const refs = [...stagedPhotos, ...stagedDocuments];
    refs.forEach(async (ref) => {
      if (ref.pending || urlByIdRef.current[ref.id]) return;
      if (!ref.id.startsWith("DRFF-")) return;
      const res = await getDraftFileUrlAction(ref.id);
      if (res.ok) {
        setUrlById((prev) => (prev[ref.id] ? prev : { ...prev, [ref.id]: res.data }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.stagedPhotos, form.stagedDocuments]);

  useEffect(() => {
    if (docViewerIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDocViewer();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docViewerIndex]);

  const commitPhotos = useCallback((refs: StagedFileRef[]) => {
    setForm({ ...formRef.current, stagedPhotos: refs, photos: refs.map((r) => r.name) });
  }, [setForm]);

  const commitDocuments = useCallback((refs: StagedFileRef[]) => {
    setForm({ ...formRef.current, stagedDocuments: refs, documents: refs.map((r) => r.name) });
  }, [setForm]);

  const addFiles = useCallback(
    (rawFiles: File[], kind: "photo" | "document") => {
      if (!canStage) {
        toast.error("Couldn't attach files — the draft isn't ready yet. Please try again in a moment.");
        return;
      }
      const commit = kind === "photo" ? commitPhotos : commitDocuments;
      const currentRefs = () =>
        (kind === "photo" ? formRef.current.stagedPhotos : formRef.current.stagedDocuments) ?? [];

      let filesToProcess = rawFiles;
      if (kind === "document") {
        filesToProcess = rawFiles.filter((file) => {
          const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
          if (!ALLOWED_DOC_EXT.has(ext)) {
            toast.error(`"${file.name}" isn't a supported file type. Please upload PDF, Word, or Excel files.`);
            return false;
          }
          if (file.size > MAX_BYTES) {
            toast.error(`"${file.name}" is over the 10 MB limit.`);
            return false;
          }
          return true;
        });
        if (filesToProcess.length === 0) return;
      }

      const temps = filesToProcess.map((file) => ({ tempId: crypto.randomUUID(), file }));

      commit([
        ...currentRefs(),
        ...temps.map((t) => ({
          id: t.tempId,
          name: t.file.name,
          mimeType: t.file.type || null,
          sizeBytes: t.file.size,
          pending: true,
        })),
      ]);

      for (const { tempId, file } of temps) {
        (async () => {
          try {
            let fileToUpload = file;

            if (kind === "photo") {
              fileToUpload = await processImageForUpload(file);
              const blobUrl = URL.createObjectURL(fileToUpload);
              setUrlById((prev) => ({ ...prev, [tempId]: blobUrl }));
            }

            const ref = await uploadAndStage(draftId!, fileToUpload, kind);

            setUrlById((prev) => {
              if (!prev[tempId]) return prev;
              const next = { ...prev, [ref.id]: prev[tempId] };
              delete next[tempId];
              return next;
            });
            commit(currentRefs().map((r) => (r.id === tempId ? ref : r)));
          } catch (err) {
            console.error("addFiles: upload failed", err);
            const reason = err instanceof Error ? err.message : "Unknown error";
            toast.error(`Couldn't upload ${file.name}. ${reason}`);
            setUrlById((prev) => {
              if (!prev[tempId]) return prev;
              revokeIfBlob(prev[tempId]);
              const next = { ...prev };
              delete next[tempId];
              return next;
            });
            commit(currentRefs().filter((r) => r.id !== tempId));
          }
        })();
      }
    },
    [canStage, draftId, commitPhotos, commitDocuments],
  );

  function removePhoto(i: number) {
    const ref = stagedPhotos[i];
    if (!ref) return;
    if (ref.id.startsWith("DRFF-")) void removeDraftFileAction(ref.id);
    setUrlById((prev) => {
      revokeIfBlob(prev[ref.id]);
      const next = { ...prev };
      delete next[ref.id];
      return next;
    });
    commitPhotos(stagedPhotos.filter((_, j) => j !== i));
    if (lightboxIndex === i) {
      setLightboxIndex(null);
    } else if (lightboxIndex !== null && lightboxIndex > i) {
      setLightboxIndex(lightboxIndex - 1);
    }
  }

  function setAsCover(i: number) {
    if (i === 0) return;
    const reordered = [...stagedPhotos];
    reordered.unshift(reordered.splice(i, 1)[0]);
    commitPhotos(reordered);
    if (lightboxIndex === i) {
      setLightboxIndex(0);
    } else if (lightboxIndex !== null && lightboxIndex < i) {
      setLightboxIndex(lightboxIndex + 1);
    }
  }

  // Move a photo card from one position to another. Persists order via photoStorageIds
  // array order (no schema change needed — Q3 resolution).
  function reorderPhoto(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const reordered = [...stagedPhotos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    commitPhotos(reordered);
  }

  function replacePhoto(i: number) {
    replacePhotoIndexRef.current = i;
    photoReplaceInputRef.current?.click();
  }

  function handlePhotoReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const idx = replacePhotoIndexRef.current;
    e.target.value = "";
    if (!file || idx < 0) return;
    removePhoto(idx);
    addFiles([file], "photo");
  }

  function removeDoc(i: number) {
    if (docViewerIndex === i) closeDocViewer();
    const ref = stagedDocuments[i];
    if (!ref) return;
    if (ref.id.startsWith("DRFF-")) void removeDraftFileAction(ref.id);
    setUrlById((prev) => {
      revokeIfBlob(prev[ref.id]);
      const next = { ...prev };
      delete next[ref.id];
      return next;
    });
    commitDocuments(stagedDocuments.filter((_, j) => j !== i));
  }

  function replaceDoc(i: number) {
    replaceDocIndexRef.current = i;
    docReplaceInputRef.current?.click();
  }

  function handleDocReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const idx = replaceDocIndexRef.current;
    e.target.value = "";
    if (!file || idx < 0) return;
    removeDoc(idx);
    addFiles([file], "document");
  }

  async function openDocViewer(i: number) {
    const ref = stagedDocuments[i];
    if (!ref || ref.pending) return;
    let url = urlByIdRef.current[ref.id];
    if (!url && ref.id.startsWith("DRFF-")) {
      const res = await getDraftFileUrlAction(ref.id);
      if (!res.ok) {
        toast.error("Couldn't open this document.");
        return;
      }
      url = res.data;
      setUrlById((prev) => ({ ...prev, [ref.id]: res.data }));
    }
    if (!url) return;
    setDocViewerUrl(url);
    setDocViewerIndex(i);
  }

  function closeDocViewer() {
    setDocViewerUrl(null);
    setDocViewerIndex(null);
  }

  function previewDoc(i: number) {
    void openDocViewer(i);
  }

  function openDocInNewTab() {
    if (!docViewerUrl) return;
    window.open(docViewerUrl, "_blank");
  }

  function downloadDoc() {
    if (!docViewerUrl) return;
    const link = document.createElement("a");
    link.href = docViewerUrl;
    link.download = openDocName;
    link.click();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    addFiles(files, "photo");
  }

  function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    addFiles(files, "document");
  }

  function handlePhotoDrop(e: React.DragEvent) {
    e.preventDefault();
    setPhotosDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || isHeic(f),
    );
    if (files.length === 0) return;
    addFiles(files, "photo");
  }

  function handleDocDrop(e: React.DragEvent) {
    e.preventDefault();
    setDocsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = "." + (f.name.split(".").pop()?.toLowerCase() ?? "");
      return ALLOWED_DOC_EXT.has(ext);
    });
    if (files.length === 0) return;
    addFiles(files, "document");
  }

  const openDocName = docViewerIndex !== null ? stagedDocuments[docViewerIndex]?.name ?? "" : "";
  const openDocIsPdf = openDocName.toLowerCase().endsWith(".pdf");
  const totalPhotos = stagedPhotos.length;

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
      {isMounted && createPortal(
        <AnimatePresence>
          {lightboxIndex !== null && stagedPhotos[lightboxIndex] && (
            <motion.div
              key="lightbox-backdrop"
              className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setLightboxIndex(null)}
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {totalPhotos > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 rounded-full px-3 py-1 text-sm text-white/80 tabular-nums pointer-events-none">
                  {lightboxIndex + 1} / {totalPhotos}
                </div>
              )}

              {totalPhotos > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                  className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: easeOut }}
                  className="flex items-center justify-center px-16 sm:px-20 w-full h-full"
                >
                  {urlById[stagedPhotos[lightboxIndex].id] ? (
                    <img
                      src={urlById[stagedPhotos[lightboxIndex].id]}
                      alt={stagedPhotos[lightboxIndex].name}
                      draggable={false}
                      onClick={(e) => e.stopPropagation()}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
                    />
                  ) : (
                    <div className="w-72 h-72 bg-white/10 rounded-xl flex flex-col items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <ImageIcon className="w-12 h-12 text-white/40" />
                      <p className="text-white/60 text-sm text-center px-4">{stagedPhotos[lightboxIndex].name}</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {totalPhotos > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                  className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}

              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none">
                {stagedPhotos[lightboxIndex].name}
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

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

      <div className="flex-1 min-h-0 flex flex-col w-full max-w-[760px] mx-auto pb-8">
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
            {photosDragging && stagedPhotos.length > 0 && (
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
              <input ref={photoInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={handlePhotoChange} />
              <input ref={photoReplaceInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handlePhotoReplace} />
            </div>

            {/* Aggregate upload progress — shown while any photo is still uploading */}
            {stagedPhotos.some((p) => p.pending) && (
              <div className="mb-4 flex items-center gap-2 text-[13px] text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                <span>
                  {stagedPhotos.filter((p) => !p.pending).length} of {stagedPhotos.length} uploaded
                </span>
              </div>
            )}

            {stagedPhotos.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                <AnimatePresence>
                  {stagedPhotos.map((photo, i) => (
                    <motion.div
                      key={photo.id}
                      className={cn(
                        "relative overflow-hidden rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.02),0px_2px_6px_0px_rgba(0,0,0,0.04),0px_4px_8px_0px_rgba(0,0,0,0.1)] group",
                        dragPhotoIndex === i && "opacity-40 scale-95",
                        dragOverPhotoIndex === i && dragPhotoIndex !== i && "ring-2 ring-blue-500 ring-offset-2",
                      )}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.3, ease: easeOut, delay: i * 0.05 }}
                      draggable={!photo.pending}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        // motion.div types onDragStart as PointerEvent; cast to access DragEvent
                        // API. Browser fires a real DragEvent here because draggable is set.
                        const de = e as unknown as React.DragEvent;
                        setDragPhotoIndex(i);
                        de.dataTransfer.effectAllowed = "move";
                        de.dataTransfer.setData("text/photo-reorder", String(i));
                      }}
                      onDragOver={(e) => {
                        e.stopPropagation();
                        const de = e as unknown as React.DragEvent;
                        // Ignore file drops from outside — only respond to card reorder drags.
                        if (!de.dataTransfer.types.includes("text/photo-reorder")) return;
                        de.preventDefault();
                        de.dataTransfer.dropEffect = "move";
                        setDragOverPhotoIndex(i);
                      }}
                      onDragEnter={(e) => { e.stopPropagation(); }}
                      onDragLeave={(e) => {
                        e.stopPropagation();
                        if (!(e.currentTarget as Element).contains(e.relatedTarget as Node))
                          setDragOverPhotoIndex(null);
                      }}
                      onDrop={(e) => {
                        e.stopPropagation();
                        const de = e as unknown as React.DragEvent;
                        de.preventDefault();
                        const fromIndex = Number(de.dataTransfer.getData("text/photo-reorder"));
                        if (!isNaN(fromIndex)) reorderPhoto(fromIndex, i);
                        setDragPhotoIndex(null);
                        setDragOverPhotoIndex(null);
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation();
                        setDragPhotoIndex(null);
                        setDragOverPhotoIndex(null);
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        className="w-full block aspect-square sm:aspect-auto sm:h-[156px] relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Preview ${photo.name}`}
                      >
                        {urlById[photo.id] ? (
                          <>
                            <img
                              src={urlById[photo.id]}
                              alt={photo.name}
                              draggable={false}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3">
                            <ImageIcon className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                            <span className="text-xs text-muted-foreground/60 truncate w-full text-center">{photo.name}</span>
                          </div>
                        )}
                        {photo.pending && (
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </button>

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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={photo.pending}>
                          <motion.button
                            type="button"
                            className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shadow-sm focus-visible:opacity-100 disabled:opacity-40"
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
            {docsDragging && stagedDocuments.length > 0 && (
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
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" onChange={handleDocChange} />
              <input ref={docReplaceInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleDocReplace} />
            </div>

            {stagedDocuments.length > 0 ? (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {stagedDocuments.map((doc, i) => {
                    const meta = getDocMeta(doc.name);
                    const ready = !doc.pending;
                    return (
                      <motion.div
                        key={doc.id}
                        className="border border-[#c3c6d7] rounded-xl flex items-center justify-between px-[17px] py-[17px]"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 14, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.32, ease: easeOut, delay: i * 0.06 }}
                        whileHover={{ backgroundColor: "rgba(0,0,0,0.015)" }}
                      >
                        <button
                          type="button"
                          onClick={() => ready && openDocViewer(i)}
                          disabled={!ready}
                          aria-label={ready ? `Preview ${doc.name}` : doc.name}
                          className={`group/doc flex items-center gap-4 flex-1 min-w-0 text-left ${ready ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <motion.div
                            className={`${meta.bg} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.28, ease: easeOut, delay: i * 0.06 + 0.08 }}
                          >
                            {doc.pending ? (
                              <Loader2 className={`w-5 h-5 ${meta.text} animate-spin`} />
                            ) : (
                              <FileText className={`w-5 h-5 ${meta.text}`} />
                            )}
                          </motion.div>
                          <div className="min-w-0">
                            <p className="text-base font-medium text-[#1a1c1c] leading-5 truncate">{doc.name}</p>
                            <p className="text-sm text-[#5b5f62] leading-[21px]">{doc.pending ? "Uploading…" : meta.label}</p>
                          </div>
                          {ready && (
                            <Eye className="w-4 h-4 text-[#2563eb] opacity-0 [@media(hover:hover)]:group-hover/doc:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild disabled={doc.pending}>
                            <motion.button
                              type="button"
                              className="rounded-full p-2 hover:bg-muted transition-colors disabled:opacity-40"
                              whileHover={{ scale: 1.12 }}
                              whileTap={{ scale: 0.88 }}
                              transition={{ duration: 0.12 }}
                              aria-label="Document options"
                            >
                              <MoreVertical className="w-4 h-4 text-[#5b5f62]" />
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {ready && (
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

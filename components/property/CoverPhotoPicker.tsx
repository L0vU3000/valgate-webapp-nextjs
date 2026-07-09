"use client";

// The cover-photo grid: upload tile + every photo already on the property, selection state,
// and an immediate save (setPropertyCover / clearPropertyCover) — independent of any other
// form on the page. Shared by SelectCoverPhotoModal (wraps this in a Dialog, used from the
// property overview page's "Change cover" button) and PropertyProfileWizard's "Cover photo"
// step (renders this directly, no Dialog, since it already lives inside a sheet).
//
// Every value here is real: photos come from the signed server list; there are no mocks.

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Star, Check, Loader2, ImageOff, X } from "lucide-react";
import {
  listPropertyPhotos,
  setPropertyCover,
  clearPropertyCover,
  presignPropertyPhotoUpload,
  attachPropertyPhotoAsDocument,
  type CoverPhoto,
} from "@/app/actions/property-photos";
import { toast } from "sonner";

export type CoverChange = { storageId: string; url: string } | null;

export function CoverPhotoPicker({
  propertyId,
  onCoverChanged,
  onSaved,
  onCancel,
}: {
  propertyId: string;
  // Fired with the new cover (storageId + signed url) on save, or null when cleared — so the
  // caller's hero/thumbnail can update immediately.
  onCoverChanged?: (next: CoverChange) => void;
  // Fired after a successful save. The modal uses this to close itself; the wizard step
  // leaves it unset since there's nothing to close.
  onSaved?: () => void;
  // Renders a Cancel button next to Save when provided (modal only — the wizard already has
  // its own Cancel/close action for the whole sheet).
  onCancel?: () => void;
}) {
  const [photos, setPhotos] = React.useState<CoverPhoto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  // The currently-chosen cover storageId. null = "no cover" (revert to map). We seed it
  // from whichever photo the server marks isCover once the list loads.
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const currentCoverId = photos.find((p) => p.isCover)?.storageId ?? null;

  const loadPhotos = React.useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const result = await listPropertyPhotos(propertyId);
    if (result.ok) {
      setPhotos(result.data);
      setSelectedId(result.data.find((p) => p.isCover)?.storageId ?? null);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, [propertyId]);

  // Load once on mount. Both call sites remount this component fresh each time it becomes
  // visible (Dialog content unmounts on close; the wizard step only renders while active),
  // so this always reflects the latest photos without needing an explicit "open" signal.
  React.useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  // Upload flow: presign → POST the bytes to storage → record as a Photos document →
  // add it to the grid and pre-select it as the cover.
  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const presign = await presignPropertyPhotoUpload(propertyId, {
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!presign.ok) {
        toast.error(presign.error);
        return;
      }
      const body = new FormData();
      for (const [key, value] of Object.entries(presign.data.fields)) {
        body.append(key, value);
      }
      body.append("file", file);
      const uploadResponse = await fetch(presign.data.url, { method: "POST", body });
      if (!uploadResponse.ok) {
        toast.error("Could not upload photo to storage");
        return;
      }
      const attached = await attachPropertyPhotoAsDocument(propertyId, presign.data.storageId, {
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!attached.ok) {
        toast.error(attached.error);
        return;
      }
      // Show the new photo at the front of the grid and select it as the cover-to-be.
      setPhotos((prev) => [attached.data, ...prev.filter((p) => p.storageId !== attached.data.storageId)]);
      setSelectedId(attached.data.storageId);
      toast.success("Photo added");
    } catch (err) {
      console.error("cover upload failed", err);
      toast.error("Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (file) void uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (selectedId === null) {
        const result = await clearPropertyCover(propertyId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        onCoverChanged?.(null);
        toast.success("Cover photo removed");
      } else {
        const result = await setPropertyCover(propertyId, selectedId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const chosen = photos.find((p) => p.storageId === selectedId);
        onCoverChanged?.(chosen ? { storageId: chosen.storageId, url: chosen.url } : null);
        toast.success("Cover photo updated");
      }
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  const dirty = selectedId !== currentCoverId;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div
        className={`rounded-lg transition-colors ${dragging ? "bg-[--val-bg-tint]" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <ImageOff className="w-7 h-7 text-slate-300" />
            <p className="text-[13px] text-slate-500">Couldn&apos;t load photos.</p>
            <button
              type="button"
              onClick={() => void loadPhotos()}
              className="text-[12px] font-semibold text-[--val-primary-dark] hover:opacity-75 transition-opacity"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Upload tile — always first, per the Tripadvisor/Cosmos pattern */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:border-[--val-primary-dark] hover:text-[--val-primary-dark] disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
              <span className="text-[12px] font-semibold">{uploading ? "Uploading…" : "Upload new"}</span>
            </button>

            {/* Existing photos */}
            {photos.map((photo) => {
              const isSelected = photo.storageId === selectedId;
              const isCurrentCover = photo.storageId === currentCoverId;
              return (
                <button
                  type="button"
                  key={photo.storageId}
                  onClick={() => setSelectedId(photo.storageId)}
                  aria-pressed={isSelected}
                  className={`group relative aspect-[4/3] rounded-lg overflow-hidden border bg-slate-100 transition-[box-shadow,border-color] ${
                    isSelected
                      ? "border-[--val-primary-dark] ring-2 ring-[--val-primary-dark] ring-offset-1"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Image
                    src={photo.url}
                    alt="Property photo"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                  {/* Current-cover badge (what's live right now) */}
                  {isCurrentCover && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[--val-primary-dark] text-white text-[10px] font-semibold px-2 py-0.5 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      Cover
                    </span>
                  )}
                  {/* Selection check (what you're about to set) */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[--val-primary-dark] text-white shadow-sm">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions: clear-cover on the left (only when a cover exists), Cancel/Save on the right */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <div>
          {currentCoverId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Remove cover
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 text-[13px] font-semibold text-val-heading border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="px-5 py-2 text-[13px] font-semibold text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-50 transition-[opacity,transform] active:scale-[0.97]"
            style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save cover photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

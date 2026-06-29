"use client";

// Photo manager for an EXISTING property. Lets the owner:
//   • upload new photos (presign → POST bytes to storage → record on the property),
//   • delete a photo (tier="confirm"; also cleans up the stored object server-side),
//   • set which photo is the cover (cover = first photo, a pure re-order server-side).
//
// All data is real: photos are the property's `photoStorageIds`, resolved to signed
// display URLs by the server. There are no mocks. The component keeps a local copy of
// the resolved photo list so the gallery updates immediately after each mutation
// without a full page reload (the server is still the source of truth on next load).

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Star, Trash2, Loader2, ImageOff } from "lucide-react";
import { ConfirmAction } from "@/components/ui/confirm-action";
import {
  presignPropertyPhotoUpload,
  attachPropertyPhoto,
  removePropertyPhoto,
  setPropertyCoverPhoto,
  getPropertyPhotoUrls,
} from "@/app/actions/property-photos";
import { toast } from "sonner";

type Photo = { storageId: string; url: string };

export function PropertyPhotoManager({ propertyId }: { propertyId: string }) {
  // The resolved photos (storageId + signed url), in cover-first order.
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  // Loading the initial gallery.
  const [loading, setLoading] = React.useState(true);
  // An error loading the gallery (distinct from "empty").
  const [loadError, setLoadError] = React.useState(false);
  // Whether an upload is in flight (disables the upload button + shows a spinner).
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch the signed photo urls once on mount. We keep storageId alongside the url so
  // the cover/delete actions know which photo to target.
  const loadPhotos = React.useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const result = await getPropertyPhotoUrls(propertyId);
    if (result.ok) {
      setPhotos(result.data);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, [propertyId]);

  React.useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  // Upload flow: presign → POST the bytes straight to storage → record on the property.
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Always clear the input so picking the same file again still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    setUploading(true);
    try {
      // 1. Ask the server for a presigned POST target + the storageId to record.
      const presign = await presignPropertyPhotoUpload(propertyId, {
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!presign.ok) {
        toast.error(presign.error);
        return;
      }

      // 2. POST the bytes to object storage. Presigned POST wants the fields first,
      //    then the file.
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

      // 3. Record the storageId on the property and refresh the gallery from the result.
      const attached = await attachPropertyPhoto(propertyId, presign.data.storageId);
      if (!attached.ok) {
        toast.error(attached.error);
        return;
      }
      toast.success("Photo added");
      await loadPhotos();
    } catch (err) {
      console.error("photo upload failed", err);
      toast.error("Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  // Move a photo to cover. Optimistically nothing — we just re-fetch on success so the
  // order and the star badge stay in sync with the server.
  async function handleSetCover(storageId: string) {
    const result = await setPropertyCoverPhoto(propertyId, storageId);
    if (result.ok) {
      // Re-order locally to match the server (cover first) so the UI updates at once.
      setPhotos((prev) => {
        const target = prev.find((p) => p.storageId === storageId);
        if (!target) return prev;
        return [target, ...prev.filter((p) => p.storageId !== storageId)];
      });
      toast.success("Cover photo updated");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-val-heading text-[15px] font-semibold">Photos</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[--val-primary-dark] hover:opacity-75 disabled:opacity-50 transition-opacity"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          {uploading ? "Uploading…" : "Add photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* ── States: loading / error / empty / gallery ── */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ImageOff className="w-6 h-6 text-slate-300" />
          <p className="text-[13px] text-slate-500">Couldn&apos;t load photos.</p>
          <button
            type="button"
            onClick={() => void loadPhotos()}
            className="text-[12px] font-semibold text-[--val-primary-dark] hover:opacity-75 transition-opacity"
          >
            Try again
          </button>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ImagePlus className="w-6 h-6 text-slate-300" />
          <p className="text-[13px] text-slate-500">No photos yet.</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-[12px] font-semibold text-[--val-primary-dark] hover:opacity-75 disabled:opacity-50 transition-opacity"
          >
            Add the first photo →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, i) => {
            const isCover = i === 0;
            return (
              <div
                key={photo.storageId}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
              >
                {/* Signed urls are short-lived and from an external bucket, so use a plain
                    img with unoptimized loading rather than the Next image optimizer. */}
                <Image
                  src={photo.url}
                  alt={isCover ? "Cover photo" : `Property photo ${i + 1}`}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />

                {/* Cover badge */}
                {isCover && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[--val-primary-dark] text-white text-[10px] font-semibold px-2 py-0.5 shadow-sm">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Cover
                  </span>
                )}

                {/* Hover actions: Set cover (non-cover only) + Delete */}
                <div className="absolute inset-0 flex items-end justify-end gap-1.5 p-1.5 bg-gradient-to-t from-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => void handleSetCover(photo.storageId)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/90 text-slate-700 hover:bg-white active:scale-95 transition-[background-color,transform]"
                      aria-label="Set as cover photo"
                      title="Set as cover"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ConfirmAction
                    tier="confirm"
                    title="Delete this photo?"
                    description="This permanently removes the photo and its stored file. This can't be undone."
                    confirmLabel="Delete photo"
                    successMessage="Photo deleted"
                    onConfirm={async () => {
                      const result = await removePropertyPhoto(propertyId, photo.storageId);
                      if (result.ok) {
                        // Drop it from the local gallery right away.
                        setPhotos((prev) =>
                          prev.filter((p) => p.storageId !== photo.storageId),
                        );
                      }
                      return result;
                    }}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/90 text-rose-600 hover:bg-white active:scale-95 transition-[background-color,transform]"
                      aria-label="Delete photo"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </ConfirmAction>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

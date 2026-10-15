"use client";

// The vault's "New folder" dialog (canvas frame 03.18). Folders are property-scoped
// (the column is NOT NULL), so the property picker is required.
//
// The canvas also draws a "Restrict" switch ("Others keep view-only access to files
// inside"). Deliberately not built: this app has no sharing or per-folder access
// model, so the switch would control nothing.

import { useState } from "react";
import { X } from "lucide-react";
import { createFolder } from "@/app/actions/folders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

// Measured from the canvas' Input/Default component (l8OudF): filled field, no border,
// 36px tall, radius 6, 12px horizontal padding, 14px text, 14px/500 label.
const FIELD_CLASS =
  "h-9 w-full rounded-lg border-0 bg-input-background px-3 text-[14px] text-val-heading placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus/40 transition-shadow duration-150";
const LABEL_CLASS = "text-[14px] font-medium text-foreground";

export function NewFolderDialog({
  open,
  onOpenChange,
  properties,
  defaultPropertyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: { id: string; name: string }[];
  defaultPropertyId?: string;
  onCreated: (folderId: string) => void;
}) {
  const [name, setName] = useState("");
  // null = the user has not picked; fall back to the default so a changed
  // defaultPropertyId is honoured on the next open.
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const propertyId = picked ?? defaultPropertyId ?? "";
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && propertyId !== "" && !pending;

  function close() {
    setName("");
    setPicked(null);
    setError(null);
    onOpenChange(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const result = await createFolder({ propertyId, name: trimmed });
      if (result.ok) {
        onCreated(result.data.id);
        close();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Could not create folder");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        className="w-[480px] max-w-[calc(100vw-32px)] gap-0 rounded-xl border border-border-default bg-white p-0 sm:max-w-[480px] [&>button:last-child]:hidden"
      >
        <form onSubmit={submit} noValidate>
          <div
            className="flex items-start gap-3 border-b border-border-subtle px-6 py-5"
            style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 30ms both" }}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogTitle className="text-[18px] font-semibold leading-6 text-val-heading">
                New folder
              </DialogTitle>
              <DialogDescription className="text-[14px] text-secondary">
                Create a folder to group files by property, renewal or audit.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-slate-100 transition-colors duration-150"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            className="flex flex-col gap-4 p-6"
            style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 70ms both" }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-folder-name" className={LABEL_CLASS}>
                Folder Name
              </label>
              <input
                id="new-folder-name"
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lease Agreements"
                maxLength={64}
                className={FIELD_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-folder-property" className={LABEL_CLASS}>
                Parent Location
              </label>
              <select
                id="new-folder-property"
                required
                value={propertyId}
                onChange={(e) => setPicked(e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="" disabled>
                  Select a property
                </option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p role="alert" className="text-[12.5px] text-status-danger">
                {error}
              </p>
            )}
          </div>

          <div
            className="flex items-center justify-end gap-2 rounded-b-xl border-t border-border-subtle bg-val-bg-page-alt px-6 py-4"
            style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 110ms both" }}
          >
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? "Creating…" : "Create Folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

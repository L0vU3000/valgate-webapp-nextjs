"use client";

// "Select cover photo" — a media-library picker for a property's cover image, opened from
// the property overview page's "Change cover" button. The grid/upload/save logic lives in
// CoverPhotoPicker, shared with the "Cover photo" step in PropertyProfileWizard.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CoverPhotoPicker, type CoverChange } from "@/components/property/CoverPhotoPicker";

export type { CoverChange };

export function SelectCoverPhotoModal({
  propertyId,
  open,
  onOpenChange,
  onCoverChanged,
}: {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Fired after a successful Save so the hero can update immediately. Passes the new
  // cover (storageId + signed url) or null when the cover was cleared.
  onCoverChanged?: (next: CoverChange) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-[18px] font-bold text-val-heading">Select cover photo</DialogTitle>
          <DialogDescription className="text-[13px] text-slate-500">
            Choose from photos on this property, or upload a new one. Drag &amp; drop works too.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[56vh] overflow-y-auto">
          <CoverPhotoPicker
            propertyId={propertyId}
            onCoverChanged={onCoverChanged}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

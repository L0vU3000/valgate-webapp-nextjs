"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { cn } from "../ui/utils";
import { CHANGELOG, type ChangeTag } from "@/lib/data/changelog";

// Badge colors per change type. New = blue (headline), Improved = violet,
// Fixed = slate (quietest). Matches the Help menu's changelog affordance.
const TAG_STYLES: Record<ChangeTag, string> = {
  New: "bg-blue-50 text-blue-700 ring-blue-600/15",
  Improved: "bg-violet-50 text-violet-700 ring-violet-600/15",
  Fixed: "bg-slate-100 text-slate-600 ring-slate-500/15",
};

// Turn an ISO date ("2026-07-08") into a readable "8 July 2026". Parsed as UTC
// noon so the day never slips a timezone.
function formatReleaseDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// The "What's new" changelog modal. Controlled by the Help menu: it owns the
// open state and clears the unread dot when this opens.
export function WhatsNewModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border-default px-6 py-4">
          <DialogTitle className="text-[17px]">What&apos;s new</DialogTitle>
          <DialogDescription>
            The latest updates and improvements to Valgate.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(80vh-73px)] overflow-y-auto px-6 py-2">
          {CHANGELOG.map((release, index) => (
            <section
              key={release.version}
              className={cn(
                "py-5",
                index > 0 && "border-t border-border-default",
              )}
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-[14px] font-semibold text-foreground">
                  Version {release.version}
                </h3>
                <span className="shrink-0 text-[12px] text-secondary">
                  {formatReleaseDate(release.date)}
                </span>
              </div>

              <ul className="flex flex-col gap-2.5">
                {release.entries.map((entry, entryIndex) => (
                  <li
                    key={entryIndex}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground"
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                        TAG_STYLES[entry.tag],
                      )}
                    >
                      {entry.tag}
                    </span>
                    <span className="flex-1">{entry.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

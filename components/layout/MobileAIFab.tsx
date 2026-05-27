"use client";

import { Sparkles } from "lucide-react";

/**
 * MobileAIFab
 *
 * Phone-only floating action button that opens the AI overlay (Valgate Agent).
 * Lives at the bottom-right of the viewport, sized 56×56 for a comfortable
 * thumb target, with safe-area-aware bottom offset so it sits above the iOS
 * home indicator.
 *
 * Hidden when the AI overlay is already open (so it doesn't sit visually
 * behind the modal). Hidden on desktop via `sm:hidden`.
 */
interface MobileAIFabProps {
  onOpen: () => void;
  /** True while the AI overlay is open — used to hide the FAB. */
  aiOpen: boolean;
}

export function MobileAIFab({ onOpen, aiOpen }: MobileAIFabProps) {
  // When the overlay is open, hide the FAB entirely. We render `null` instead
  // of toggling opacity so the button isn't focusable while hidden.
  if (aiOpen) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open Valgate Agent"
      className="sm:hidden fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-interactive-primary text-white shadow-lg shadow-interactive-primary/30 transition-transform duration-150 hover:scale-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page [animation:fade-slide-up_0.25s_ease-out_both]"
      style={{
        bottom: "calc(1rem + env(safe-area-inset-bottom))",
      }}
    >
      <Sparkles className="size-6" strokeWidth={2} />
    </button>
  );
}

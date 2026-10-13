import type React from "react";
import { cn } from "../ui/utils";

export function MapIconButton({
  children,
  onClick,
  spin,
  className,
  label,
  pressed,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  spin?: boolean;
  className?: string;
  /** Accessible name. These buttons are icon-only, so a screen reader has nothing else to read. */
  label?: string;
  /** For the ones that latch (measurements): a toggle that reports its own state, not just a name. */
  pressed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "bg-glass-icon-btn-fill backdrop-blur-md border border-glass-icon-btn-border rounded-lg p-2 shadow-sm text-secondary hover:bg-surface-base hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-150 [&_svg]:transition-transform [&_svg]:duration-300",
        spin && "hover:[&_svg]:rotate-180",
        className,
      )}
    >
      {children}
    </button>
  );
}

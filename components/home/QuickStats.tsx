import type React from "react";
import { cn } from "../ui/utils";

export function MapIconButton({
  children,
  onClick,
  spin,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  spin?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
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

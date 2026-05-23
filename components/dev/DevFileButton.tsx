"use client";

import { isDevToolsEnabled } from "@/lib/dev-tools";

interface DevFileButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function DevFileButton({ label, onClick, disabled = false }: DevFileButtonProps) {
  if (!isDevToolsEnabled) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150"
    >
      <span className="px-1.5 py-0.5 bg-amber-400 text-white rounded text-[10px] font-bold uppercase tracking-wide">
        DEV
      </span>
      {label}
    </button>
  );
}

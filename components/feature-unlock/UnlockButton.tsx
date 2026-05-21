"use client";

import { Lock, Shield } from "lucide-react";
import type { UnlockState } from "./types";

interface UnlockButtonProps {
  state: UnlockState;
  onClick: () => void;
  editLabel?: string;
}

export function UnlockButton({ state, onClick, editLabel = "Edit ownership" }: UnlockButtonProps) {
  const gradientStyle = {
    background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
    boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
  };

  if (state.kind === "unlock") {
    return (
      <button
        onClick={onClick}
        className="px-5 py-2.5 text-white text-[14px] font-semibold rounded-lg flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
        style={gradientStyle}
      >
        <Lock className="w-3.5 h-3.5" />
        Unlock feature
      </button>
    );
  }

  if (state.kind === "verify") {
    return (
      <button
        onClick={onClick}
        className="px-5 py-2.5 text-[14px] font-semibold rounded-lg flex items-center gap-2 border-2 border-amber-400 text-amber-600 bg-white hover:bg-amber-50 active:scale-[0.97] transition-all duration-150"
      >
        <Shield className="w-3.5 h-3.5" />
        Verify to unlock
      </button>
    );
  }

  // kind === "edit" — pill lives next to the page title, button is standalone
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 text-white text-[14px] font-semibold rounded-lg flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
      style={gradientStyle}
    >
      {editLabel}
    </button>
  );
}

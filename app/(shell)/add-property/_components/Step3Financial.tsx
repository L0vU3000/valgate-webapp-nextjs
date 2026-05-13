"use client";

import { useState, useEffect } from "react";
import { Users, Home, KeyRound } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { FormData, WizardStatus } from "./types";

const STATUS_OPTIONS: { value: Exclude<WizardStatus, "">; label: string; sub: string; Icon: typeof Users }[] = [
  { value: "Rented", label: "Rented", sub: "Tenant in place", Icon: KeyRound },
  { value: "Owner-Occupied", label: "Owner-occupied", sub: "You live here", Icon: Home },
  { value: "Vacant", label: "Vacant", sub: "Empty / available", Icon: Users },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function Step3Financial({
  form,
  setForm,
  goNext,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  goNext?: () => void;
}) {
  const [displayValue, setDisplayValue] = useState(
    form.currentMarketValue
      ? Number(form.currentMarketValue).toLocaleString()
      : ""
  );
  const [mounted, setMounted] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setDisplayValue(raw ? Number(raw).toLocaleString() : "");
    setForm({ ...form, currentMarketValue: raw });
  }

  function handleSkip() {
    setForm({ ...form, currentMarketValue: "" });
    goNext?.();
  }

  function handleStatusSelect(value: Exclude<WizardStatus, "">) {
    setForm({ ...form, status: value });
  }

  const ease = "cubic-bezier(0.25, 1, 0.5, 1)";

  function enterStyle(delayMs: number): React.CSSProperties {
    if (reduced) return {};
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(14px)",
      transition: `opacity 0.45s ${ease} ${delayMs}ms, transform 0.45s ${ease} ${delayMs}ms`,
    };
  }

  return (
    <div className="flex flex-col gap-10 items-start pb-8 w-full max-w-[600px] mx-auto">
      {/* Heading */}
      <div className="flex flex-col gap-[11px] items-center w-full" style={enterStyle(0)}>
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          Status and value
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Where things stand today and your best estimate of value.
        </p>
      </div>

      {/* Status selector */}
      <div className="flex flex-col gap-3 w-full" style={enterStyle(60)}>
        <span className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
          Current status
        </span>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const selected = form.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusSelect(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-slate-400",
                )}
                aria-pressed={selected}
              >
                <opt.Icon
                  className={cn(
                    "w-4 h-4 transition-colors duration-200",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-[14px] font-semibold leading-5",
                    selected ? "text-primary" : "text-foreground",
                  )}
                >
                  {opt.label}
                </span>
                <span className="text-[12px] text-muted-foreground leading-4">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Value card */}
      <div
        className="flex flex-col gap-4 items-start p-6 rounded-2xl border border-border w-full"
        style={enterStyle(120)}
      >
        {/* Dollar input */}
        <div className="relative w-full group">
          <div className="border border-border rounded-xl pl-[65px] pr-6 py-[22px] hover:border-slate-400 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all duration-200">
            <input
              type="text"
              inputMode="numeric"
              value={displayValue}
              onChange={handleChange}
              placeholder="0"
              className="w-full text-[32px] font-semibold text-foreground placeholder:text-muted-foreground bg-transparent outline-none leading-normal"
            />
          </div>
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[32px] font-medium text-foreground pointer-events-none select-none group-focus-within:text-primary transition-colors duration-200">
            $
          </span>
        </div>

        {/* Label + skip link */}
        <div className="flex items-center justify-between w-full">
          <span className="text-[14px] text-muted-foreground leading-5">
            Estimated market value
          </span>
          <button
            onClick={handleSkip}
            className="text-[14px] font-medium text-primary leading-5 underline decoration-transparent hover:decoration-current active:opacity-60 transition-[text-decoration-color] duration-200"
          >
            I&apos;ll add this later
          </button>
        </div>
      </div>
    </div>
  );
}

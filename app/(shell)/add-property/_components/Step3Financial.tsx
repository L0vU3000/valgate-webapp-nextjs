"use client";

import { useState, useEffect } from "react";
import { Users, Home, KeyRound, Building2, Landmark, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/components/ui/utils";
import { OptionalLabel } from "@/components/ui/required-mark";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FormData, WizardStatus } from "./types";

const STATUS_OPTIONS: { value: Exclude<WizardStatus, "">; label: string; sub: string; Icon: typeof Users }[] = [
  { value: "Rented", label: "Rented", sub: "Tenant in place", Icon: KeyRound },
  { value: "Owner-Occupied", label: "Owner-occupied", sub: "You live here", Icon: Home },
  { value: "Vacant", label: "Vacant", sub: "Empty / available", Icon: Users },
];

const OWNERSHIP_OPTIONS = [
  { value: "fully-owned", label: "Fully Owned", sub: "No mortgage", Icon: Home },
  { value: "mortgaged", label: "Mortgaged", sub: "Bank loan", Icon: Landmark },
  { value: "leased", label: "Leased", sub: "Leasehold", Icon: KeyRound },
  { value: "under-construction", label: "Under Construction", sub: "In progress", Icon: Building2 },
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
  errors,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  goNext?: () => void;
  errors?: Record<string, string> | null;
}) {
  const [purchasePriceDisplay, setPurchasePriceDisplay] = useState(
    form.purchasePrice
      ? Number(form.purchasePrice).toLocaleString()
      : ""
  );
  const [dateInputText, setDateInputText] = useState(
    form.purchaseDate
      ? format(new Date(form.purchaseDate + "T00:00:00"), "MM/dd/yyyy")
      : ""
  );
  const [calOpen, setCalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handlePurchasePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setPurchasePriceDisplay(raw ? Number(raw).toLocaleString() : "");
    setForm({ ...form, purchasePrice: raw });
  }

  function handleStatusSelect(value: Exclude<WizardStatus, "">) {
    setForm({ ...form, status: value });
  }

  function handleOwnershipSelect(value: string) {
    setForm({ ...form, ownershipStatus: value });
  }

  function handleManualDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip non-digits and auto-insert slashes as MM/DD/YYYY
    let digits = e.target.value.replace(/[^0-9]/g, "");
    let display = digits;
    if (digits.length > 2) display = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) display = display.slice(0, 5) + "/" + digits.slice(4);
    display = display.slice(0, 10);
    setDateInputText(display);

    if (display.length === 10) {
      const [mm, dd, yyyy] = display.split("/");
      const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      if (!isNaN(date.getTime())) {
        setForm({ ...form, purchaseDate: `${yyyy}-${mm}-${dd}` });
      }
    } else if (display.length === 0) {
      setForm({ ...form, purchaseDate: "" });
    }
  }

  function handleCalSelect(date: Date | undefined) {
    if (date) {
      setDateInputText(format(date, "MM/dd/yyyy"));
      setForm({ ...form, purchaseDate: format(date, "yyyy-MM-dd") });
    } else {
      setDateInputText("");
      setForm({ ...form, purchaseDate: "" });
    }
    setCalOpen(false);
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
          Fill in what you know — all fields are optional. You can add more details later.
        </p>
      </div>

      {/* Property status selector */}
      <div className="flex flex-col gap-3 w-full" style={enterStyle(60)}>
        <span className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
          Property status <OptionalLabel />
        </span>
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
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

      {/* Ownership status selector */}
      <div className="flex flex-col gap-3 w-full" style={enterStyle(120)}>
        <span className="text-[14px] text-foreground flex items-center" style={{ fontWeight: 600 }}>
          Ownership status <OptionalLabel />
        </span>
        <div className="grid grid-cols-2 gap-2">
          {OWNERSHIP_OPTIONS.map((opt) => {
            const selected = form.ownershipStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleOwnershipSelect(opt.value)}
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

      {/* Purchase details card — purchase price + purchase date */}
      <div
        className="flex flex-col gap-4 items-start p-4 sm:p-6 rounded-2xl border border-border w-full"
        style={enterStyle(180)}
      >
        {/* Purchase price input */}
        <div className="relative w-full group">
          <div className="border border-border rounded-xl pl-[65px] pr-6 py-[22px] hover:border-slate-400 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all duration-200">
            <input
              type="text"
              inputMode="numeric"
              value={purchasePriceDisplay}
              onChange={handlePurchasePriceChange}
              placeholder="0"
              className="w-full text-[32px] font-semibold text-foreground placeholder:text-muted-foreground bg-transparent outline-none leading-normal"
            />
          </div>
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[32px] font-medium text-foreground pointer-events-none select-none group-focus-within:text-primary transition-colors duration-200">
            $
          </span>
        </div>
        <span className="text-[14px] text-muted-foreground leading-5 -mt-2 flex items-center">
          Purchase price <OptionalLabel />
        </span>

        {/* Divider */}
        <div className="w-full h-px bg-border" />

        {/* Purchase date — type or pick */}
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-[14px] font-semibold text-foreground flex items-center">
            Purchase date <OptionalLabel />
          </span>
          <div className="flex items-center border border-border rounded-xl hover:border-slate-400 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-all duration-200 bg-background overflow-hidden">
            <input
              type="text"
              inputMode="numeric"
              value={dateInputText}
              onChange={handleManualDateInput}
              placeholder="MM / DD / YYYY"
              maxLength={10}
              className="flex-1 px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground bg-transparent outline-none"
            />
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center px-3 py-3 text-muted-foreground hover:text-foreground transition-colors duration-200 border-l border-border shrink-0"
                  aria-label="Open date picker"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-lg" align="end">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  startMonth={new Date(1950, 0, 1)}
                  endMonth={new Date()}
                  selected={form.purchaseDate ? new Date(form.purchaseDate + "T00:00:00") : undefined}
                  onSelect={handleCalSelect}
                  defaultMonth={form.purchaseDate ? new Date(form.purchaseDate + "T00:00:00") : undefined}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

    </div>
  );
}

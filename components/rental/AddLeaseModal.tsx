"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/components/ui/utils";
import {
  PhoneSheet,
  PhoneSheetBody,
  PhoneSheetContent,
  PhoneSheetDescription,
  PhoneSheetFooter,
  PhoneSheetHeader,
  PhoneSheetTitle,
} from "@/components/ui/phone-sheet";
import { createLease } from "@/app/actions/leases";
import type { PropertySummary } from "@/app/(shell)/rental/queries";

/**
 * AddLeaseModal
 *
 * Used by the Rental Dashboard to create a new lease. Renders as a
 * full-screen bottom sheet on phone (form scrolls inside the body, the
 * two CTAs are pinned above the home indicator via pb-safe) and as a
 * centered dialog at ~480px on tablet+.
 */
interface AddLeaseModalProps {
  open: boolean;
  onClose: () => void;
  properties: PropertySummary[];
}

const STAGES = ["Approaching", "Offered", "Signed", "Declined"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function AddLeaseModal({
  open,
  onClose,
  properties,
}: AddLeaseModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [unit, setUnit] = useState("");
  const [stage, setStage] = useState<typeof STAGES[number]>("Signed");
  const [startDate, setStartDate] = useState(today());
  const [termMonths, setTermMonths] = useState(12);
  const [monthlyRent, setMonthlyRent] = useState("");

  const endDate = addMonths(startDate, termMonths);

  function handleClose() {
    setError(null);
    setSuccess(false);
    setUnit("");
    setMonthlyRent("");
    setPropertyId(properties[0]?.id ?? "");
    setStage("Signed");
    setStartDate(today());
    setTermMonths(12);
    onClose();
  }

  // Radix passes the new open state. We only care about close-from-overlay.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rent = parseFloat(monthlyRent);
    if (!propertyId) {
      setError("Please select a property.");
      return;
    }
    if (!unit.trim()) {
      setError("Unit / address line is required.");
      return;
    }
    if (isNaN(rent) || rent <= 0) {
      setError("Enter a valid monthly rent.");
      return;
    }

    startTransition(async () => {
      const result = await createLease({
        propertyId,
        unit: unit.trim(),
        stage,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        monthlyRent: rent,
        termMonths,
        renewalStatus: undefined,
        tenantId: undefined,
      });

      if (!result.ok) {
        setError(result.error ?? "Failed to create lease.");
      } else {
        setSuccess(true);
        setTimeout(handleClose, 1200);
      }
    });
  }

  return (
    <PhoneSheet open={open} onOpenChange={handleOpenChange}>
      <PhoneSheetContent
        desktopMaxWidth="sm:max-w-[480px]"
        // Use a form as the inner flex container so the submit button can
        // be inside the pinned footer while still triggering form submit.
        className="sm:rounded-xl"
      >
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <PhoneSheetHeader className="flex-col items-start gap-1">
            <PhoneSheetTitle className="text-[18px] font-bold text-val-heading">
              New Lease
            </PhoneSheetTitle>
            <PhoneSheetDescription className="text-[13px] text-slate-400">
              Add a rental lease to your portfolio
            </PhoneSheetDescription>
          </PhoneSheetHeader>

          <PhoneSheetBody className="flex flex-col gap-4">
            {/* Property */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Property
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-val-heading focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {properties.length === 0 && (
                  <option value="">No properties available</option>
                )}
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Unit / Address
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Unit 2A or 45 Palm Ave"
                className="min-h-11 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Stage — 2×2 grid on phone (chip text fits comfortably),
                4-up row on tablet+ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Lease Stage
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className={cn(
                      "min-h-11 rounded-lg border px-2 py-2 text-[12px] font-semibold transition-colors",
                      stage === s
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Rent */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Monthly Rent ($)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="e.g. 2500"
                inputMode="decimal"
                className="min-h-11 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Start Date + Term — 2 cols at all sizes, both fields are
                narrow enough to fit comfortably even at 390px (~165px each). */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Term (months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={termMonths}
                  onChange={(e) =>
                    setTermMonths(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            {/* Computed end date */}
            <p className="text-[12px] text-slate-400">
              Lease ends:{" "}
              <span className="font-semibold text-slate-600">
                {new Date(endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">
                Lease created successfully!
              </p>
            )}
          </PhoneSheetBody>

          <PhoneSheetFooter className="sm:justify-stretch">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-[14px] font-semibold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="min-h-11 flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25)",
              }}
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Creating…" : "Create Lease"}
            </button>
          </PhoneSheetFooter>
        </form>
      </PhoneSheetContent>
    </PhoneSheet>
  );
}

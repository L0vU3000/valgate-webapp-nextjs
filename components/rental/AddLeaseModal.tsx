"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { createLease } from "@/lib/actions/leases.actions";
import type { PropertySummary } from "@/app/(shell)/rental/queries";

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

export function AddLeaseModal({ open, onClose, properties }: AddLeaseModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [unit, setUnit] = useState("");
  const [stage, setStage] = useState<typeof STAGES[number]>("Signed");
  const [startDate, setStartDate] = useState(today());
  const [termMonths, setTermMonths] = useState(12);
  const [monthlyRent, setMonthlyRent] = useState("");

  if (!open) return null;

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rent = parseFloat(monthlyRent);
    if (!propertyId) { setError("Please select a property."); return; }
    if (!unit.trim()) { setError("Unit / address line is required."); return; }
    if (isNaN(rent) || rent <= 0) { setError("Enter a valid monthly rent."); return; }

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-[480px] rounded-xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-[18px] font-bold text-val-heading">New Lease</h2>
            <p className="text-[13px] text-slate-400 mt-0.5">Add a rental lease to your portfolio</p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* Property */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Property
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-val-heading focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              {properties.length === 0 && (
                <option value="">No properties available</option>
              )}
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Stage */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Lease Stage
            </label>
            <div className="flex gap-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-[12px] font-semibold transition-colors",
                    stage === s
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Start Date + Term */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
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
                onChange={(e) => setTermMonths(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-val-heading focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Computed end date */}
          <p className="text-[12px] text-slate-400">
            Lease ends: <span className="font-semibold text-slate-600">{new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </p>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 font-semibold">
              Lease created successfully!
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60 active:scale-[0.98] transition-all"
              style={{
                background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25)",
              }}
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Creating…" : "Create Lease"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

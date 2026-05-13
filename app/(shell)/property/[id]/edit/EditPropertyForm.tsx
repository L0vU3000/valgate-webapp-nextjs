"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MoreVertical, Archive } from "lucide-react";
import type { Property } from "@/lib/data/types/property";
import { step2Schema, step3Schema } from "@/app/(shell)/add-property/_components/schemas";
import { editPropertyAction, archivePropertyAction, restorePropertyAction } from "@/app/(shell)/property/actions";
import { TYPE_LABEL } from "@/lib/property-helpers";
import { CAMBODIA_PROVINCES } from "@/lib/constants/cambodia-provinces";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const editPropertySchema = step2Schema
  .merge(step3Schema)
  .extend({
    propertyType: z
      .enum([
        "residential",
        "commercial",
        "multi-unit",
        "retail",
        "land",
        "industrial",
        "construction",
        "other",
        "",
      ])
      .optional(),
    status: z.enum(["Rented", "Vacant", "For Sale", "Sold"]).optional(),
  });

type EditFormData = z.infer<typeof editPropertySchema>;

const PROPERTY_TYPES = [
  "residential",
  "commercial",
  "multi-unit",
  "retail",
  "land",
  "industrial",
  "construction",
  "other",
] as const;

const STATUSES = ["Rented", "Vacant", "For Sale", "Sold"] as const;

const OWNERSHIP_STATUSES = [
  "Owned outright",
  "Mortgaged",
  "Leasehold",
  "Co-owned",
  "Other",
];

const INPUT =
  "w-full border border-border rounded-lg px-3 py-2 text-[14px] text-foreground bg-[#f7f8fe] placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_8%,transparent)] transition-[border-color,box-shadow] duration-200";

const LABEL = "block text-[13px] font-semibold text-foreground mb-1.5";

const ERROR = "text-[12px] text-[--status-danger] mt-1";

interface Props {
  property: Property;
  defaults: EditFormData;
}

export function EditPropertyForm({ property, defaults }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editPropertySchema),
    defaultValues: defaults,
  });

  async function onSubmit(data: EditFormData) {
    setSaving(true);
    setServerError(null);
    const result = await editPropertyAction(property.id, data);
    setSaving(false);
    if (result.ok) {
      router.push(`/property/${property.id}/overview`);
    } else {
      setServerError(result.error ?? "Failed to save. Please try again.");
    }
  }

  return (
    <div
      className="h-full flex flex-col font-['Inter',sans-serif] bg-background"
      style={{ animation: "fade-slide-up 480ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/property/${property.id}/overview`}
            className="text-slate-400 hover:text-val-heading transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em]">
              {property.code}
            </p>
            <h1 className="text-[18px] font-bold text-val-heading leading-tight">
              Edit property
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/property/${property.id}/overview`}
            className="px-4 py-2 text-[13px] font-semibold text-val-heading border border-slate-200 rounded hover:bg-slate-50 transition-colors duration-150"
          >
            Discard
          </Link>
          <button
            type="submit"
            form="edit-property-form"
            disabled={saving}
            className="px-5 py-2 text-[13px] font-semibold text-white rounded hover:opacity-90 active:scale-[0.97] disabled:opacity-50 transition-all duration-150"
            style={{
              background:
                "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
              boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25)",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors duration-150 p-1 rounded">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer"
                onSelect={() => setArchiveOpen(true)}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-1">
                <Archive className="w-5 h-5 text-amber-500" />
              </div>
              <DialogTitle>Archive this property?</DialogTitle>
              <DialogDescription>
                It will no longer appear in your portfolio or KPIs. You can restore it at any time from the archived properties list.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={() => setArchiveOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-val-heading border border-slate-200 rounded hover:bg-slate-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setArchiving(true);
                  const result = await archivePropertyAction(property.id);
                  setArchiving(false);
                  setArchiveOpen(false);
                  if (result.ok) {
                    toast.success("Property archived", {
                      action: {
                        label: "Undo",
                        onClick: () => restorePropertyAction(property.id),
                      },
                      duration: 5000,
                    });
                    router.push("/portfolio");
                  }
                }}
                disabled={archiving}
                className="px-4 py-2 text-sm font-semibold text-white rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors duration-150"
              >
                {archiving ? "Archiving…" : "Archive"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-auto">
        <form
          id="edit-property-form"
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-[720px] mx-auto px-8 py-8"
        >
          {serverError && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-[13px] text-red-600">
              {serverError}
            </div>
          )}

          {/* ── Property Details ── */}
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em] mb-6">
            Property Details
          </p>

          {/* Property name */}
          <div className="mb-5">
            <label className={LABEL}>Property name</label>
            <input
              {...register("propertyName")}
              type="text"
              placeholder="e.g. Skyline Residence"
              className={INPUT}
            />
            {errors.propertyName && (
              <p className={ERROR}>{errors.propertyName.message}</p>
            )}
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={LABEL}>Property type</label>
              <select {...register("propertyType")} className={INPUT}>
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select {...register("status")} className={INPUT}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Total area + Year built */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={LABEL}>Total area (m²)</label>
              <input
                {...register("totalArea")}
                type="text"
                inputMode="decimal"
                placeholder="e.g. 120"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Year built</label>
              <input
                {...register("yearBuilt")}
                type="text"
                inputMode="numeric"
                placeholder="e.g. 2018"
                className={INPUT}
              />
            </div>
          </div>

          {/* Bedrooms / Bathrooms / Parking / Storage */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            <div>
              <label className={LABEL}>Bedrooms</label>
              <input
                {...register("bedrooms")}
                type="text"
                inputMode="numeric"
                placeholder="0"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Bathrooms</label>
              <input
                {...register("bathrooms")}
                type="text"
                inputMode="numeric"
                placeholder="0"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Parking</label>
              <input
                {...register("parkingSpaces")}
                type="text"
                inputMode="numeric"
                placeholder="0"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Storage</label>
              <input
                {...register("storageUnit")}
                type="text"
                placeholder="—"
                className={INPUT}
              />
            </div>
          </div>

          {/* Address subsection */}
          <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.04em] mb-4">
            Address
          </p>

          <div className="mb-4">
            <label className={LABEL}>Street address</label>
            <input
              {...register("addressLine")}
              type="text"
              placeholder="e.g. #12, Street 51"
              className={INPUT}
            />
          </div>

          <div className="mb-4">
            <label className={LABEL}>
              Apartment / suite{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              {...register("addressLine2")}
              type="text"
              placeholder="Unit, floor, etc."
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className={LABEL}>City</label>
              <input
                {...register("city")}
                type="text"
                placeholder="Phnom Penh"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>
                Province <span className="text-red-500">*</span>
              </label>
              <select {...register("province")} className={INPUT}>
                <option value="">Select province</option>
                {CAMBODIA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.province && (
                <p className={ERROR}>{errors.province.message}</p>
              )}
            </div>
            <div>
              <label className={LABEL}>ZIP / Postal code</label>
              <input
                {...register("zip")}
                type="text"
                placeholder="12000"
                className={INPUT}
              />
            </div>
          </div>

          <div className="mb-2">
            <label className={LABEL}>Country</label>
            <input
              {...register("country")}
              type="text"
              placeholder="Cambodia"
              className={INPUT}
            />
          </div>

          {/* ── Financial Information ── */}
          <div className="border-t border-slate-100 pt-8 mt-8">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.05em] mb-6">
              Financial Information
            </p>

            {/* Current market value */}
            <div className="mb-5">
              <label className={LABEL}>Current market value</label>
              <input
                {...register("currentMarketValue")}
                type="text"
                inputMode="decimal"
                placeholder="e.g. 250000"
                className={INPUT}
              />
            </div>

            {/* Purchase price + Purchase date */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className={LABEL}>Purchase price</label>
                <input
                  {...register("purchasePrice")}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 200000"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Purchase date</label>
                <input
                  {...register("purchaseDate")}
                  type="date"
                  className={INPUT}
                />
              </div>
            </div>

            {/* Outstanding mortgage + Monthly P/I */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className={LABEL}>Outstanding mortgage</label>
                <input
                  {...register("outstandingMortgage")}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 150000"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Monthly P/I payment</label>
                <input
                  {...register("monthlyPayment")}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 1200"
                  className={INPUT}
                />
              </div>
            </div>

            {/* Interest rate + Annual property tax */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className={LABEL}>Interest rate (%)</label>
                <input
                  {...register("interestRate")}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 5.5"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Annual property tax</label>
                <input
                  {...register("annualPropertyTax")}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 800"
                  className={INPUT}
                />
              </div>
            </div>

            {/* Tax assessment value + Annual insurance */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className={LABEL}>Tax assessment value</label>
                <input
                  {...register("taxAssessmentValue")}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 220000"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Annual insurance</label>
                <input
                  {...register("annualInsurance")}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 600"
                  className={INPUT}
                />
              </div>
            </div>

            {/* Ownership status */}
            <div className="mb-8">
              <label className={LABEL}>Ownership status</label>
              <select {...register("ownershipStatus")} className={INPUT}>
                <option value="">Select ownership status</option>
                {OWNERSHIP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

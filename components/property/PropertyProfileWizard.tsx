"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { WizardProgress } from "@/components/feature-unlock/WizardProgress";
import type { WizardProgressStep } from "@/components/feature-unlock/WizardProgress";
import { editPropertyAction } from "@/app/(shell)/property/actions";
import type { Property } from "@/lib/data/types/property";
import { TYPE_LABEL } from "@/lib/property-helpers";
import { CAMBODIA_PROVINCES } from "@/lib/constants/cambodia-provinces";
import {
  EDITABLE_STATUSES,
  OWNERSHIP_STATUSES,
  PROPERTY_PROFILE_STEPS,
  PROPERTY_TYPES,
  editPropertySchema,
  propertyToFormDefaults,
  type EditPropertyFormData,
} from "@/lib/property-form";
import { toast } from "sonner";
import { RequiredMark, OptionalLabel } from "@/components/ui/required-mark";

const INPUT =
  "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-val-heading bg-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--val-primary-dark)] focus:shadow-[0_0_0_3px_oklch(55%_0.15_250_/_0.08)] transition-[border-color,box-shadow] duration-200";

const LABEL = "block text-[13px] font-semibold text-val-heading mb-1.5";

const ERROR = "text-[12px] text-red-600 mt-1";

const GRADIENT_STYLE = {
  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.20)",
};

interface PropertyProfileWizardProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailsStep({
  form,
}: {
  form: UseFormReturn<EditPropertyFormData>;
}) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL} htmlFor="propertyName">
          Property name
        </label>
        <input
          id="propertyName"
          {...register("propertyName")}
          type="text"
          placeholder="e.g. Skyline Residence"
          className={INPUT}
        />
        {errors.propertyName && (
          <p className={ERROR}>{errors.propertyName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="propertyType">
            Property type
          </label>
          <select id="propertyType" {...register("propertyType")} className={INPUT}>
            <option value="">Select type</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="status">
            Status
          </label>
          <select id="status" {...register("status")} className={INPUT}>
            {EDITABLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="totalArea">
            Total area (m²)
          </label>
          <input
            id="totalArea"
            {...register("totalArea")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 120"
            className={INPUT}
          />
          {errors.totalArea && (
            <p className={ERROR}>{errors.totalArea.message}</p>
          )}
        </div>
        <div>
          <label className={LABEL} htmlFor="yearBuilt">
            Year built
          </label>
          <input
            id="yearBuilt"
            {...register("yearBuilt")}
            type="text"
            inputMode="numeric"
            placeholder="e.g. 2018"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={LABEL} htmlFor="bedrooms">
            Bedrooms
          </label>
          <input
            id="bedrooms"
            {...register("bedrooms")}
            type="text"
            inputMode="numeric"
            placeholder="0"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="bathrooms">
            Bathrooms
          </label>
          <input
            id="bathrooms"
            {...register("bathrooms")}
            type="text"
            inputMode="numeric"
            placeholder="0"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="parkingSpaces">
            Parking
          </label>
          <input
            id="parkingSpaces"
            {...register("parkingSpaces")}
            type="text"
            inputMode="numeric"
            placeholder="0"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="storageUnit">
            Storage
          </label>
          <input
            id="storageUnit"
            {...register("storageUnit")}
            type="text"
            placeholder="—"
            className={INPUT}
          />
        </div>
      </div>
    </div>
  );
}

function AddressStep({
  form,
}: {
  form: UseFormReturn<EditPropertyFormData>;
}) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL} htmlFor="addressLine">
          Street address
        </label>
        <input
          id="addressLine"
          {...register("addressLine")}
          type="text"
          placeholder="e.g. #12, Street 51"
          className={INPUT}
        />
        {errors.addressLine && (
          <p className={ERROR}>{errors.addressLine.message}</p>
        )}
      </div>

      <div>
        <label className={LABEL + " flex items-center"} htmlFor="addressLine2">
          Apartment / suite <OptionalLabel />
        </label>
        <input
          id="addressLine2"
          {...register("addressLine2")}
          type="text"
          placeholder="Unit, floor, etc."
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL} htmlFor="city">
            City
          </label>
          <input
            id="city"
            {...register("city")}
            type="text"
            placeholder="Phnom Penh"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="province">
            Province
          </label>
          <select id="province" {...register("province")} className={INPUT}>
            <option value="">Select province</option>
            {CAMBODIA_PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
          {errors.province && (
            <p className={ERROR}>{errors.province.message}</p>
          )}
        </div>
        <div>
          <label className={LABEL} htmlFor="zip">
            ZIP / Postal code
          </label>
          <input
            id="zip"
            {...register("zip")}
            type="text"
            placeholder="12000"
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="country">
          Country
        </label>
        <input
          id="country"
          {...register("country")}
          type="text"
          placeholder="Cambodia"
          className={INPUT}
        />
      </div>
    </div>
  );
}

function FinancialStep({
  form,
}: {
  form: UseFormReturn<EditPropertyFormData>;
}) {
  const { register } = form;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL} htmlFor="currentMarketValue">
          Current market value
        </label>
        <input
          id="currentMarketValue"
          {...register("currentMarketValue")}
          type="text"
          inputMode="decimal"
          placeholder="e.g. 250000"
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="purchasePrice">
            Purchase price
          </label>
          <input
            id="purchasePrice"
            {...register("purchasePrice")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 200000"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="purchaseDate">
            Purchase date
          </label>
          <input
            id="purchaseDate"
            {...register("purchaseDate")}
            type="date"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="outstandingMortgage">
            Outstanding mortgage
          </label>
          <input
            id="outstandingMortgage"
            {...register("outstandingMortgage")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 150000"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="monthlyPayment">
            Monthly P/I payment
          </label>
          <input
            id="monthlyPayment"
            {...register("monthlyPayment")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 1200"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="interestRate">
            Interest rate (%)
          </label>
          <input
            id="interestRate"
            {...register("interestRate")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 5.5"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="annualPropertyTax">
            Annual property tax
          </label>
          <input
            id="annualPropertyTax"
            {...register("annualPropertyTax")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 800"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="taxAssessmentValue">
            Tax assessment value
          </label>
          <input
            id="taxAssessmentValue"
            {...register("taxAssessmentValue")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 220000"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="annualInsurance">
            Annual insurance
          </label>
          <input
            id="annualInsurance"
            {...register("annualInsurance")}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 600"
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="ownershipStatus">
          Ownership status
        </label>
        <select id="ownershipStatus" {...register("ownershipStatus")} className={INPUT}>
          <option value="">Select ownership status</option>
          {OWNERSHIP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PropertyProfileWizard({
  property,
  open,
  onOpenChange,
}: PropertyProfileWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EditPropertyFormData>({
    resolver: zodResolver(editPropertySchema),
    defaultValues: propertyToFormDefaults(property),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(propertyToFormDefaults(property));
    setStepIndex(0);
    setError(null);
    setSubmitting(false);
  }, [open, property, form]);

  const currentStep = PROPERTY_PROFILE_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === PROPERTY_PROFILE_STEPS.length - 1;

  const progressSteps: WizardProgressStep[] = PROPERTY_PROFILE_STEPS.map((step, index) => ({
    key: step.key,
    title: step.title,
    status: (
      index === stepIndex
        ? "active"
        : index < stepIndex
          ? "completed"
          : "pending"
    ) as WizardProgressStep["status"],
  }));

  async function handleNext() {
    if (!currentStep) return;
    const valid = await form.trigger([...currentStep.fields]);
    if (!valid) {
      setError("Some fields on this step need attention before you continue.");
      return;
    }
    setError(null);
    if (isLastStep) {
      await handleSave();
    } else {
      setStepIndex((index) => index + 1);
    }
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    const result = await editPropertyAction(property.id, form.getValues());
    setSubmitting(false);
    if (result.ok) {
      toast.success("Property profile updated");
      onOpenChange(false);
      router.refresh();
      return;
    }
    setError("Couldn't save your changes. Check your connection and try again.");
  }

  function handleBack() {
    setError(null);
    if (stepIndex > 0) setStepIndex((index) => index - 1);
  }

  function handleClose() {
    onOpenChange(false);
  }

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[860px] sm:max-w-[860px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Edit property profile</DialogTitle>

        <div className="flex min-h-[620px] max-h-[88vh]">
          {/* Left rail */}
          <div
            className="w-[216px] shrink-0 flex flex-col border-r border-slate-200 overflow-y-auto"
            style={{ background: "oklch(97% 0.005 250)" }}
          >
            <div className="px-6 pt-8 pb-6 border-b border-slate-200/70">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                {property.code}
              </p>
              <h2 className="text-[16px] font-bold text-val-heading leading-snug">
                Property profile
              </h2>
              <p className="text-[12px] text-slate-500 mt-1.5 leading-snug line-clamp-2">
                {property.name}
              </p>
            </div>

            <div className="px-6 pt-6 flex-1">
              <WizardProgress steps={progressSteps} />
            </div>
          </div>

          {/* Right body */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
            <div className="px-10 pt-8 pb-6 border-b border-slate-100 shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--val-primary-dark)] mb-2">
                {String(stepIndex + 1).padStart(2, "0")} / {String(PROPERTY_PROFILE_STEPS.length).padStart(2, "0")}
              </p>
              <h3 className="text-[22px] font-bold text-val-heading leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-[14px] text-slate-500 mt-1.5 leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-7">
              {error && (
                <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-red-700 leading-snug">
                      Couldn&apos;t save your changes
                    </p>
                    <p className="text-[12px] text-red-600 mt-0.5 leading-snug">
                      {error}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 text-red-400 hover:text-red-600 transition-colors mt-0.5"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {currentStep.key === "details" && <DetailsStep form={form} />}
              {currentStep.key === "address" && <AddressStep form={form} />}
              {currentStep.key === "financial" && <FinancialStep form={form} />}
            </div>

            <div className="px-10 py-5 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstStep || submitting}
                className="px-4 py-2 text-[13px] font-semibold text-slate-500 hover:text-val-heading disabled:opacity-30 disabled:pointer-events-none transition-colors duration-150"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="px-6 py-2.5 text-[14px] font-semibold text-white rounded-lg flex items-center gap-2 disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
                style={GRADIENT_STYLE}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : isLastStep ? (
                  "Save profile"
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";
import type { FormData, Step } from "@/app/_shared/add-property/types";
import { defaultForm, stepLabels } from "@/app/_shared/add-property/types";
import { Step1PropertyType } from "@/app/_shared/add-property/Step1PropertyType";
import { Step2BasicInfo } from "@/app/_shared/add-property/Step2BasicInfo";
import { Step3Financial } from "@/app/_shared/add-property/Step3Financial";
import { Step4PhotosDocs } from "@/app/_shared/add-property/Step4PhotosDocs";
import { Step5Review } from "@/app/_shared/add-property/Step5Review";
import { FlowFooter } from "@/app/_shared/add-property/FlowFooter";
import { PortfolioSelectorModal } from "./PortfolioSelectorModal";
import { ProFormError } from "./pro-modal";
import {
  upsertPropertyDraftAction,
  convertDraftToDocumentsAction,
  convertDraftToDocumentsForOrgAction,
} from "@/app/actions/property-drafts";

type ClientOption = {
  id: string;
  name: string;
  targetOrgId?: string;
};

export function AddPropertyFlowPro({
  clients,
  open,
  onOpenChange,
}: {
  clients: ClientOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<"select" | "wizard" | "success">("select");

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Non-fatal notice shown on the success screen when the property saved but some staged
  // files couldn't be attached (e.g. storage hiccup). The property itself was created.
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string> | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  // Sync parent open prop to internal selectorOpen
  if (open && !selectorOpen && !wizardOpen && phase === "select") {
    setPhase("select");
    setSelectedClientId(null);
    setTargetOrgId(null);
    setStep(1);
    setForm(defaultForm);
    setSubmitError(null);
    setFileNotice(null);
    setStepErrors(null);
    setDraftId(null);
    setSelectorOpen(true);
  }

  const handleClientSelect = useCallback((clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    setSelectedClientId(clientId);
    if (client?.targetOrgId) setTargetOrgId(client.targetOrgId);
    setSelectorOpen(false);
    setPhase("wizard");
    setWizardOpen(true);
    // Create a server draft up front so photo/document uploads in Step 4 have a place to
    // stage. The draft lives in the manager's OWN org; on submit, convertDraftToDocuments
    // (or its ForOrg variant) moves the staged files onto the new property. Without a draft
    // id, Step4PhotosDocs blocks every upload.
    void (async () => {
      const res = await upsertPropertyDraftAction({
        title: "Untitled property",
        step: 1,
        form: defaultForm,
      });
      if (res.ok) setDraftId(res.data.id);
    })();
  }, [clients]);

  const handleCreateNew = useCallback(() => {
    setSelectorOpen(false);
    router.push("/pro/clients?onboard=1");
  }, [router]);

  const goNext = () => {
    if (step === 2) {
      const errors: Record<string, string> = {};
      if (!form.propertyName.trim()) {
        errors.propertyName = "Please enter a property name";
      }
      if (form.totalArea && !/^\d+(\.\d+)?$/.test(form.totalArea)) {
        errors.totalArea = "Total area must be a number";
      }
      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        return;
      }
    }
    if (step === 3) {
      const errors: Record<string, string> = {};
      if (form.currentMarketValue && !/^\d+$/.test(form.currentMarketValue)) {
        errors.currentMarketValue = "Market value must be a whole number (e.g. 150000)";
      }
      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        return;
      }
    }
    setStepErrors(null);
    setStep((s) => Math.min(s + 1, 5) as Step);
  };

  const goBack = () => {
    setStepErrors(null);
    setStep((s) => Math.max(s - 1, 1) as Step);
  };

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setFileNotice(null);

    try {
      const propertyInput = {
        name: form.propertyName,
        type: form.propertyType,
        status: form.status || "Vacant",
        purchasePrice: form.purchasePrice || undefined,
        addressLine: form.addressLine || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        country: form.country || undefined,
        zip: form.zip || undefined,
        lat: form.mapCenter?.[1] ?? undefined,
        lng: form.mapCenter?.[0] ?? undefined,
        totalArea: form.totalArea || "",
      };

      if (targetOrgId) {
        const createPropertyForOrg = await import("@/app/actions/properties").then(
          (m) => m.createPropertyForOrg,
        );
        const result = await createPropertyForOrg(targetOrgId, propertyInput);
        if (!result.ok) {
          setSubmitError(result.error ?? "Could not create property.");
          setSubmitting(false);
          return;
        }
        // Attach any staged photos/documents to the new property (which lives in the
        // client's org, so we use the cross-org convert). A failure here is non-fatal: the
        // property already exists, so we show a soft notice on success rather than block —
        // re-submitting would create a duplicate property.
        if (draftId) {
          const convertResult = await convertDraftToDocumentsForOrgAction(
            draftId,
            result.data.id,
            targetOrgId,
          );
          if (!convertResult.ok) {
            setFileNotice(
              "The property was created, but some files couldn't be attached. You can re-upload them from the property page.",
            );
          }
        }
      } else if (selectedClientId) {
        const createProperty = await import("@/app/actions/properties").then(
          (m) => m.createProperty,
        );
        const result = await createProperty(propertyInput);
        if (!result.ok) {
          setSubmitError(result.error ?? "Could not create property.");
          setSubmitting(false);
          return;
        }

        const assignProperties = await import("@/app/(pro)/pro/actions").then(
          (m) => m.assignProperties,
        );
        const assignResult = await assignProperties({
          clientId: selectedClientId,
          propertyIds: [result.data.id],
        });
        if (!assignResult.ok) {
          setSubmitError("Property was created but couldn't be assigned. You can assign it later.");
          setSubmitting(false);
          return;
        }
        // This property lives in the manager's OWN org, so the single-org convert applies.
        if (draftId) {
          const convertResult = await convertDraftToDocumentsAction(draftId, result.data.id);
          if (!convertResult.ok) {
            setFileNotice(
              "The property was created, but some files couldn't be attached. You can re-upload them from the property page.",
            );
          }
        }
      } else {
        setSubmitError("No client selected.");
        setSubmitting(false);
        return;
      }

      setPhase("success");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    setWizardOpen(false);
    setPhase("select");
    onOpenChange(false);
    router.refresh();
  }

  // Persist the current form into the open draft so progress isn't lost while the wizard
  // is open (same-session). No-op until the draft id exists.
  function handleSaveDraft() {
    if (!draftId) return;
    void upsertPropertyDraftAction({
      id: draftId,
      title: form.propertyName || "Untitled property",
      step,
      form,
    });
  }

  const progressPercent = (step / 5) * 100;

  return (
    <>
      <PortfolioSelectorModal
        open={selectorOpen}
        onOpenChange={(open) => {
          setSelectorOpen(open);
          if (!open && phase === "select") setPhase("select");
        }}
        clients={clients}
        onSelect={handleClientSelect}
        onCreateNew={handleCreateNew}
      />

      <Dialog open={wizardOpen} onOpenChange={(open) => {
        setWizardOpen(open);
        if (!open) {
          setPhase("select");
          onOpenChange(false);
        }
      }}>
        <DialogContent
          className={cn(
            "gap-0 border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900",
            "sm:max-w-3xl max-h-[90vh] flex flex-col",
          )}
        >
          {phase === "wizard" && (
            <>
              {/* Header with progress */}
              <div className="shrink-0 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold text-slate-500">
                    Step {step} of 5: {stepLabels[step]}
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {Math.round(progressPercent)}%
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Step content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                {step === 1 && (
                  <Step1PropertyType form={form} setForm={setForm} goNext={goNext} />
                )}
                {step === 2 && (
                  <Step2BasicInfo form={form} setForm={setForm} errors={stepErrors} />
                )}
                {step === 3 && (
                  <Step3Financial form={form} setForm={setForm} goNext={goNext} errors={stepErrors} />
                )}
                {step === 4 && (
                  <Step4PhotosDocs form={form} setForm={setForm} draftId={draftId} />
                )}
                {step === 5 && (
                  <Step5Review form={form} goToStep={(s) => setStep(s as Step)} />
                )}
              </div>

              {/* Error banner */}
              {submitError && (
                <div className="shrink-0 px-6 pb-2">
                  <ProFormError message={submitError} />
                </div>
              )}

              {/* Footer */}
              <div className="shrink-0 border-t border-slate-100 px-6 py-4">
                <FlowFooter
                  onBack={goBack}
                  onSaveDraft={handleSaveDraft}
                  onContinue={goNext}
                  onSubmit={handleSubmit}
                  isFinalStep={step === 5}
                  submitting={submitting}
                  stepError={step < 5 ? (stepErrors ? "Please fix the highlighted fields to continue" : null) : null}
                  submitError={null}
                />
              </div>
            </>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 px-6">
              <motion.span
                initial={shouldReduceMotion ? undefined : { scale: 0.6, opacity: 0 }}
                animate={shouldReduceMotion ? undefined : { scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
              >
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </motion.span>
              <div className="text-center">
                <p className="text-[16px] font-semibold text-slate-900">
                  Property created
                </p>
                <p className="mt-1 text-[13px] text-slate-500">
                  {form.propertyName} has been added to the portfolio.
                </p>
              </div>
              {fileNotice && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                  {fileNotice}
                </div>
              )}
              <button
                type="button"
                onClick={handleDone}
                className="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-5 text-[13px] font-medium text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
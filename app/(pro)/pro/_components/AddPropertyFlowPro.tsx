"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";
import type { FormData, Step } from "@/app/_shared/add-property/types";
import { defaultForm } from "@/app/_shared/add-property/types";
import { StepSkeleton } from "@/app/_shared/add-property/StepSkeleton";
// Step 1 (the type picker) renders first, so it stays static. Steps 2–5 are code-split so
// their heavy code (mapbox picker in 2, date-fns calendar in 3, image tooling + motion in 4)
// only downloads when the manager reaches that step — keeping it out of the /pro/properties
// and /pro/clients bundles that mount this modal. ssr: false is correct (client-only modal).
import { Step1PropertyType } from "@/app/_shared/add-property/Step1PropertyType";
const Step2BasicInfo = dynamic(
  () => import("@/app/_shared/add-property/Step2BasicInfo").then((m) => m.Step2BasicInfo),
  { ssr: false, loading: () => <StepSkeleton /> },
);
const Step3Financial = dynamic(
  () => import("@/app/_shared/add-property/Step3Financial").then((m) => m.Step3Financial),
  { ssr: false, loading: () => <StepSkeleton /> },
);
const Step4PhotosDocs = dynamic(
  () => import("@/app/_shared/add-property/Step4PhotosDocs").then((m) => m.Step4PhotosDocs),
  { ssr: false, loading: () => <StepSkeleton /> },
);
const Step5Review = dynamic(
  () => import("@/app/_shared/add-property/Step5Review").then((m) => m.Step5Review),
  { ssr: false, loading: () => <StepSkeleton /> },
);
import { FlowFooter } from "@/app/_shared/add-property/FlowFooter";
import { PortfolioSelectorModal } from "./PortfolioSelectorModal";
import { OnboardClientWizard } from "@/app/(pro)/pro/clients/_components/OnboardClientWizard";
import { ProFormError } from "./pro-modal";
import { createProperty, createPropertyForOrg } from "@/app/actions/properties";
import { assignProperties } from "@/app/(pro)/pro/properties.actions";
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

// Step rail metadata: short labels + one-line contextual hints per step.
const RAIL_STEPS: Array<{ step: Step; label: string; hint: string }> = [
  { step: 1, label: "Type", hint: "Choose the category that best describes this asset." },
  { step: 2, label: "Basics", hint: "Add the address and key details — name is the only required field." },
  { step: 3, label: "Financial", hint: "Financial details help calculate performance. All fields are optional." },
  { step: 4, label: "Photos & Docs", hint: "Photos help your client recognise the property at a glance." },
  { step: 5, label: "Review", hint: "Review everything before adding to the portfolio." },
];

export function AddPropertyFlowPro({
  clients,
  open,
  onOpenChange,
}: {
  clients: ClientOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  // D2: nested OnboardClientWizard — opens inline when manager clicks "Onboard a new client".
  const [nestedWizardOpen, setNestedWizardOpen] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState("the portfolio");
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // fileNotice: property was created but some staged files couldn't attach (non-fatal).
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string> | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  // Track the previous open value so the effect below only fires on false→true transitions.
  const prevOpenRef = useRef(false);

  // When the parent opens this flow (open: false→true), reset all wizard state and show
  // the portfolio selector. Not firing on close preserves in-progress state (no stale flash).
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedClientId(null);
      setSelectedClientName("the portfolio");
      setTargetOrgId(null);
      setStep(1);
      setForm(defaultForm);
      setDraftId(null);
      setSubmitError(null);
      setFileNotice(null);
      setStepErrors(null);
      setShowSuccess(false);
      setSelectorOpen(true);
    }
    prevOpenRef.current = open;
  }, [open]);

  // Create a server draft so Step4PhotosDocs has somewhere to stage uploads immediately.
  // Fire-and-forget: a missing draftId means photos won't stage, but submit still works.
  function startDraft() {
    void (async () => {
      const res = await upsertPropertyDraftAction({
        title: "Untitled property",
        step: 1,
        form: defaultForm,
      });
      if (res.ok) setDraftId(res.data.id);
    })();
  }

  // Existing client selected from the portfolio picker.
  const handleClientSelect = useCallback(
    (clientId: string) => {
      const client = clients.find((c) => c.id === clientId);
      setSelectedClientId(clientId);
      setSelectedClientName(client?.name ?? "the portfolio");
      if (client?.targetOrgId) setTargetOrgId(client.targetOrgId);
      setSelectorOpen(false);
      setWizardOpen(true);
      startDraft();
    },
    [clients],
  );

  // D2: manager clicked "Onboard a new client" — open the nested wizard instead of
  // navigating away, which would lose the add-property wizard context.
  const handleCreateNew = useCallback(() => {
    setSelectorOpen(false);
    setNestedWizardOpen(true);
  }, []);

  // D2 round-trip: the nested wizard created the client org. Set targetOrgId so the
  // property submit creates the property IN the client's org, then open the property wizard.
  const handleNestedWizardComplete = useCallback(
    (orgId: string, clientName: string) => {
      setNestedWizardOpen(false);
      setTargetOrgId(orgId);
      setSelectedClientName(clientName);
      setWizardOpen(true);
      startDraft();
    },
    [],
  );

  const goNext = useCallback(() => {
    if (step === 2) {
      const errors: Record<string, string> = {};
      if (!form.propertyName.trim()) errors.propertyName = "Please enter a property name";
      if (form.totalArea && !/^\d+(\.\d+)?$/.test(form.totalArea))
        errors.totalArea = "Total area must be a number";
      if (Object.keys(errors).length) { setStepErrors(errors); return; }
    }
    if (step === 3) {
      const errors: Record<string, string> = {};
      if (form.currentMarketValue && !/^\d+$/.test(form.currentMarketValue))
        errors.currentMarketValue = "Market value must be a whole number (e.g. 150000)";
      if (Object.keys(errors).length) { setStepErrors(errors); return; }
    }
    setStepErrors(null);
    setStep((s) => Math.min(s + 1, 5) as Step);
  }, [step, form]);

  const goBack = useCallback(() => {
    setStepErrors(null);
    setStep((s) => Math.max(s - 1, 1) as Step);
  }, []);

  // Persist the current form to the open draft (same-session only — D3).
  const handleSaveDraft = useCallback(() => {
    if (!draftId) return;
    void upsertPropertyDraftAction({
      id: draftId,
      title: form.propertyName || "Untitled property",
      step,
      form,
    });
  }, [draftId, form, step]);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setFileNotice(null);

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

    try {
      if (targetOrgId) {
        // D2 path: property lives in the CLIENT's org (not the manager's).
        const result = await createPropertyForOrg(targetOrgId, propertyInput);
        if (!result.ok) { setSubmitError(result.error ?? "Could not create property."); return; }

        // Attach staged files via the cross-org convert. Failure here is non-fatal:
        // the property already exists and re-submitting would create a duplicate.
        if (draftId) {
          const cvt = await convertDraftToDocumentsForOrgAction(draftId, result.data.id, targetOrgId);
          if (!cvt.ok)
            setFileNotice("The property was created, but some files couldn't be attached. You can re-upload from the property page.");
        }
      } else if (selectedClientId) {
        // Standard path: property lives in the manager's org, then assigned to client.
        const result = await createProperty(propertyInput);
        if (!result.ok) { setSubmitError(result.error ?? "Could not create property."); return; }

        const assignResult = await assignProperties({
          clientId: selectedClientId,
          propertyIds: [result.data.id],
        });
        if (!assignResult.ok) {
          setSubmitError("Property was created but couldn't be assigned. You can assign it from the properties table.");
          return;
        }
        if (draftId) {
          const cvt = await convertDraftToDocumentsAction(draftId, result.data.id);
          if (!cvt.ok)
            setFileNotice("The property was created, but some files couldn't be attached. You can re-upload from the property page.");
        }
      } else {
        setSubmitError("No client selected.");
        return;
      }

      setShowSuccess(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeHint = RAIL_STEPS.find((s) => s.step === step)?.hint ?? "";

  return (
    <>
      {/* D2: nested onboarding wizard — inline, no route change */}
      <OnboardClientWizard
        open={nestedWizardOpen}
        onOpenChange={(isOpen) => {
          setNestedWizardOpen(isOpen);
          // Manager cancelled nested wizard → return to portfolio selector.
          if (!isOpen) setSelectorOpen(true);
        }}
        unassignedProperties={[]}
        onComplete={handleNestedWizardComplete}
      />

      <PortfolioSelectorModal
        open={selectorOpen}
        onOpenChange={(isOpen) => {
          setSelectorOpen(isOpen);
          if (!isOpen) onOpenChange(false);
        }}
        clients={clients}
        onSelect={handleClientSelect}
        onCreateNew={handleCreateNew}
      />

      <Dialog
        open={wizardOpen}
        onOpenChange={(isOpen) => {
          setWizardOpen(isOpen);
          if (!isOpen) onOpenChange(false);
        }}
      >
        <DialogContent
          className={cn(
            "gap-0 border-slate-200 bg-white p-0",
            "sm:max-w-3xl max-h-[90vh] flex flex-col",
          )}
        >
          {!showSuccess ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left step rail */}
              <div className="hidden sm:flex shrink-0 w-[164px] flex-col border-r border-slate-100 py-5 px-3 gap-0.5">
                {RAIL_STEPS.map((s) => {
                  const isDone = s.step < step;
                  const isActive = s.step === step;
                  return (
                    <div
                      key={s.step}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                        isActive ? "bg-blue-50 text-blue-700"
                          : isDone ? "text-emerald-600"
                          : "text-slate-400",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          isActive ? "bg-blue-600 text-white"
                            : isDone ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : s.step}
                      </span>
                      {s.label}
                    </div>
                  );
                })}
              </div>

              {/* Right content area */}
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-slate-50 px-5 pt-3.5 pb-3">
                  <p className="text-[12px] text-slate-400">{activeHint}</p>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                  {step === 1 && <Step1PropertyType form={form} setForm={setForm} goNext={goNext} />}
                  {step === 2 && <Step2BasicInfo form={form} setForm={setForm} errors={stepErrors} />}
                  {step === 3 && <Step3Financial form={form} setForm={setForm} goNext={goNext} errors={stepErrors} />}
                  {step === 4 && <Step4PhotosDocs form={form} setForm={setForm} draftId={draftId} />}
                  {step === 5 && <Step5Review form={form} goToStep={(s) => setStep(s as Step)} />}
                </div>

                {submitError && (
                  <div className="shrink-0 px-6 pb-2">
                    <ProFormError message={submitError} />
                  </div>
                )}

                <div className="shrink-0">
                  <FlowFooter
                    onBack={goBack}
                    onSaveDraft={handleSaveDraft}
                    onContinue={goNext}
                    onSubmit={() => { void handleSubmit(); }}
                    isFinalStep={step === 5}
                    submitting={submitting}
                    stepError={step < 5 && stepErrors ? "Please fix the highlighted fields to continue" : null}
                    submitError={null}
                  />
                </div>
              </div>
            </div>
          ) : (
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
                <p className="text-[16px] font-semibold text-slate-900">Property created</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  {form.propertyName} has been added to {selectedClientName}.
                </p>
              </div>
              {fileNotice && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                  {fileNotice}
                </div>
              )}
              <button
                type="button"
                onClick={() => { setWizardOpen(false); onOpenChange(false); }}
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

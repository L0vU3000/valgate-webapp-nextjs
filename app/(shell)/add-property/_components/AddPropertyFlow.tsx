"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { AppHeader } from "@/components/layout/AppHeader";
import type { Step } from "./types";
import { defaultForm, stepLabels } from "./types";
import type { FormData } from "./types";
import type { PropertyDraftSummary } from "@/lib/data/add-property-page";
import { useDrafts } from "../_lib/use-drafts";
import { submitPropertyAction } from "../actions";
import { Step0NewOrDraft } from "./Step0NewOrDraft";
import { Step1PropertyType } from "./Step1PropertyType";
import { Step2BasicInfo } from "./Step2BasicInfo";
import { Step3Financial } from "./Step3Financial";
import { Step4PhotosDocs } from "./Step4PhotosDocs";
import { Step5Review } from "./Step5Review";
import { Step6Success } from "./Step6Success";
import { FlowFooter } from "./FlowFooter";
import { HowItWorksGate } from "./how-it-works";
import { StepIntro } from "./how-it-works/StepIntro";
import { AdvisorModal } from "./AdvisorModal";

export function AddPropertyFlow({ drafts }: { drafts: PropertyDraftSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { drafts: localDrafts, activeId, mounted, setActive, upsert, remove, clearActive } =
    useDrafts();

  const hasUrlParams = !!(searchParams.get("draftId") || searchParams.get("step"));
  const [preFlowStage, setPreFlowStage] = useState<"landing" | null>(
    () => hasUrlParams ? null : "landing",
  );
  const [advisorModalOpen, setAdvisorModalOpen] = useState(false);
  // walkthroughGate: 1-indexed gate number currently shown, null = no gate
  const [walkthroughGate, setWalkthroughGate] = useState<number | null>(null);
  // track which interstitial gates have already been seen (skip on back-nav)
  const [gate1Shown, setGate1Shown] = useState(() => hasUrlParams);
  const [gate2Shown, setGate2Shown] = useState(() => hasUrlParams);
  const [gate3Shown, setGate3Shown] = useState(() => hasUrlParams);
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string> | null>(null);
  const latestFormRef = useRef<FormData>(defaultForm);
  const successScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 6) successScrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // Delay modal until Step0 page animations have settled (~800ms)
  useEffect(() => {
    if (preFlowStage !== null || hasUrlParams) return;
    const t = setTimeout(() => setAdvisorModalOpen(true), 800);
    return () => clearTimeout(t);
  // hasUrlParams is stable for the component's lifetime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preFlowStage]);

  // Hydrate from URL params once localStorage drafts are loaded
  useEffect(() => {
    if (!mounted) return;
    const urlDraftId = searchParams.get("draftId");
    const urlStep = Number(searchParams.get("step")) as Step;
    if (urlDraftId) {
      const draft = localDrafts.find((d) => d.id === urlDraftId);
      if (draft) {
        setForm(draft.form);
        setStep(draft.step);
        setActive(urlDraftId);
        setPreFlowStage(null);
        return;
      }
    }
    if (urlStep >= 1 && urlStep <= 6) {
      setStep(urlStep);
      setPreFlowStage(null);
    }
  // Run once after mount; searchParams and localDrafts are stable at that point
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Autosave form changes while on steps 1–5
  useEffect(() => {
    if (!mounted || !activeId || step < 1 || step > 5) return;
    upsert(activeId, form, step);
  }, [form, step, activeId, mounted, upsert]);

  // Clear step errors whenever the user edits the form
  useEffect(() => {
    setStepErrors(null);
  }, [form]);

  const advanceToStep1 = useCallback(
    (newForm: FormData) => {
      const id = crypto.randomUUID();
      setActive(id);
      setForm(newForm);
      setStep(1);
      router.replace(`/add-property?step=1&draftId=${id}`);
    },
    [router, setActive],
  );

  const goNext = () => {
    // Step 2: property name is required; total area must be a valid number if provided
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
    // Step 3: market value must be a whole number if provided
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

    const next = Math.min(step + 1, 6) as Step;
    if (next === 3 && !gate2Shown) { setWalkthroughGate(2); return; }
    if (next === 5 && !gate3Shown) { setWalkthroughGate(3); return; }
    setStep(next);
  };
  const goBack = () => {
    setStepErrors(null);
    setStep((s) => Math.max(s - 1, 0) as Step);
  };

  function handleGateContinue() {
    if (walkthroughGate === 1) {
      setGate1Shown(true);
      setWalkthroughGate(null);
      advanceToStep1(latestFormRef.current);
    } else if (walkthroughGate === 2) {
      setGate2Shown(true);
      setWalkthroughGate(null);
      setStep(3);
    } else if (walkthroughGate === 3) {
      setGate3Shown(true);
      setWalkthroughGate(null);
      setStep(5);
    }
  }

  function handleGateBack() {
    setWalkthroughGate(null);
  }

  function handleLoadDemo() {
    const id = "demo-" + Date.now();
    const demoForm: FormData = {
      method: "manual",
      propertyType: "residential",
      propertyName: "Sunny Vista Retreat",
      status: "Rented",
      confirmedCode: "",
      addressLine: "2847 Oceanview Drive",
      addressLine2: "",
      city: "Malibu",
      province: "Phnom Penh",
      zip: "90265",
      country: "US",
      yearBuilt: "2018",
      totalArea: "3200",
      bedrooms: "4",
      bathrooms: "3",
      parkingSpaces: "2",
      storageUnit: "Unit 2B",
      purchasePrice: "1200000",
      purchaseDate: "2022-03-15",
      currentMarketValue: "1250000",
      ownershipStatus: "leased",
      outstandingMortgage: "850000",
      monthlyPayment: "4200",
      interestRate: "6.75",
      annualPropertyTax: "12500",
      taxAssessmentValue: "1100000",
      annualInsurance: "3200",
      photos: ["exterior.jpg", "living-room.jpg", "kitchen.jpg", "bedroom.jpg"],
      documents: ["Purchase_Agreement.pdf", "Title_Deed.pdf", "Insurance_Policy.pdf"],
    };
    setActive(id);
    setForm(demoForm);
    upsert(id, demoForm, 5);
    setStep(5);
    router.replace(`/add-property?step=5&draftId=${id}`);
  }

  function handleSetFormFromStep0(f: FormData) {
    latestFormRef.current = f;
    setForm(f);
  }
  function handleContinueFromStep0() {
    if (!gate1Shown) {
      setWalkthroughGate(1);
    } else {
      advanceToStep1(latestFormRef.current);
    }
  }

  function handleResumeDraft(id: string) {
    const draft = localDrafts.find((d) => d.id === id);
    if (!draft) return;
    setForm(draft.form);
    setStep(draft.step);
    setActive(id);
    router.replace(`/add-property?step=${draft.step}&draftId=${id}`);
  }

  function handleSaveAsDraft() {
    if (activeId) {
      upsert(activeId, form, step);
    }
    router.push("/portfolio");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPropertyAction(form);
      if (result.ok) {
        if (result.propertyCode) {
          setForm((f) => ({ ...f, confirmedCode: result.propertyCode! }));
        }
        clearActive();
        setStep(6);
      } else {
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const progressPercent = step === 0 ? 0 : (step / 6) * 100;

  return (
    <div className="h-full flex flex-col bg-white">
      <AppHeader />
      <div className="flex-1 flex flex-col overflow-hidden">
        {preFlowStage === "landing" && (
          <div className="flex-1 overflow-hidden">
            <StepIntro onStart={() => setPreFlowStage(null)} />
          </div>
        )}
        {preFlowStage === null && walkthroughGate !== null && (
          <div className="flex-1 overflow-hidden">
            <HowItWorksGate
              stepIndex={walkthroughGate - 1}
              onContinue={handleGateContinue}
              onBack={handleGateBack}
            />
          </div>
        )}
        {preFlowStage === null && walkthroughGate === null && <>
        {/* Header — steps 1–5 */}
        {step >= 1 && step <= 5 && (
          <div className="px-4 sm:px-8 pt-4 sm:pt-5 pb-0 shrink-0 sticky top-0 z-[5] bg-surface-page/95 backdrop-blur sm:static sm:bg-transparent sm:backdrop-blur-0">
            <div className="max-w-[1160px] mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Add Property</span>
              </div>
              <div className="w-full h-2 bg-[#E8EAED] rounded-full mb-1.5">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-primary text-[14px] mb-4" style={{ fontWeight: 500 }}>
                Step {step} of 6: {stepLabels[step]}
              </p>
            </div>
          </div>
        )}


        {/* Advisor modal — shown over Step0 on first visit */}
        <AnimatePresence>
          {step === 0 && advisorModalOpen && (
            <AdvisorModal
              onSetupWithAdvisor={() => setAdvisorModalOpen(false)}
              onSetupOwn={() => setAdvisorModalOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Content */}
        {step === 6 ? (
          <div ref={successScrollRef} className="flex-1 overflow-auto">
            <Step6Success form={form} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-4 sm:px-8 pb-4 flex flex-col min-h-0">
            <div className="max-w-full sm:max-w-[1160px] mx-auto w-full flex-1 min-h-0 flex flex-col">
              {step === 0 && (
                <Step0NewOrDraft
                  form={form}
                  setForm={handleSetFormFromStep0}
                  onContinue={handleContinueFromStep0}
                  drafts={drafts}
                  localDrafts={localDrafts}
                  draftsLoading={!mounted}
                  onResumeDraft={handleResumeDraft}
                  onDeleteDraft={remove}
                  onLoadDemo={
                    process.env.NODE_ENV === "development"
                      ? handleLoadDemo
                      : undefined
                  }
                />
              )}
              {step === 1 && <Step1PropertyType form={form} setForm={setForm} goNext={goNext} />}
              {step === 2 && <Step2BasicInfo form={form} setForm={setForm} errors={stepErrors} />}
              {step === 3 && <Step3Financial form={form} setForm={setForm} goNext={goNext} errors={stepErrors} />}
              {step === 4 && <Step4PhotosDocs form={form} setForm={setForm} />}
              {step === 5 && <Step5Review form={form} goToStep={(s) => setStep(s as Step)} />}
            </div>
          </div>
        )}

        {/* Footer — steps 1–5 */}
        {step >= 1 && step <= 5 && (
          <FlowFooter
            onBack={goBack}
            onSaveDraft={handleSaveAsDraft}
            onContinue={goNext}
            onSubmit={handleSubmit}
            isFinalStep={step === 5}
            submitting={submitting}
            stepError={step < 5 ? (stepErrors ? "Please fix the highlighted fields to continue" : null) : null}
            submitError={submitError}
          />
        )}
        </>}
      </div>
    </div>
  );
}

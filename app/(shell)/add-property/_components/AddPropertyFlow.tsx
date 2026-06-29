"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import type { Step } from "./types";
import { defaultForm, stepLabels } from "./types";
import type { FormData } from "./types";
import type { PropertyDraftSummary } from "@/lib/data/add-property-page";
import { useDrafts } from "../_lib/use-drafts";
import { submitPropertyAction } from "../actions";
import { getPropertyDraftAction, getDraftFileUrlAction } from "@/app/actions/property-drafts";
import type { DraftFileView } from "@/app/actions/property-drafts";
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

// Rebuilds the form's media fields (display names + staged references) from a draft's staged
// files, split by kind. Used when resuming a draft so Step 4 shows the already-uploaded files.
function mediaFromFiles(files: DraftFileView[]): Partial<FormData> {
  const toRef = (f: DraftFileView) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
  });
  const photos = files.filter((f) => f.kind === "photo");
  const documents = files.filter((f) => f.kind === "document");
  return {
    photos: photos.map((f) => f.name),
    stagedPhotos: photos.map(toRef),
    documents: documents.map((f) => f.name),
    stagedDocuments: documents.map(toRef),
  };
}

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
  // Non-fatal notice shown on the success screen when some staged files didn't make it to storage
  // (e.g. S3 not configured). The property itself was still created.
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [successCoverUrl, setSuccessCoverUrl] = useState<string | undefined>(undefined);
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
    if (urlDraftId && urlDraftId.startsWith("DRFT-")) {
      // Fetch the draft + its staged files so Step 4's photos/documents come back after a refresh.
      void (async () => {
        const res = await getPropertyDraftAction(urlDraftId);
        if (!res.ok) return;
        const media = mediaFromFiles(res.data.files);
        setForm({ ...defaultForm, ...(res.data.draft.form as Partial<FormData>), ...media });
        setStep(res.data.draft.step as Step);
        setActive(urlDraftId);
        setPreFlowStage(null);
      })();
      return;
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

  // Once the active draft has its server id (after the first autosave create), reflect it in the
  // URL's draftId. A refresh then resumes the right server draft. We only touch draftId — the
  // step param and everything else stay as-is.
  useEffect(() => {
    if (!mounted || !activeId || !activeId.startsWith("DRFT-")) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("draftId") === activeId) return;
    params.set("draftId", activeId);
    router.replace(`/add-property?${params.toString()}`);
  }, [activeId, mounted, router]);

  // Clear step errors whenever the user edits the form
  useEffect(() => {
    setStepErrors(null);
  }, [form]);

  const advanceToStep1 = useCallback(
    (newForm: FormData) => {
      // Assign a temporary client id so autosave has a handle to fire on. The first autosave
      // CREATEs the server draft and swaps activeId to its DRFT-xxxx id; the effect below then
      // reflects that server id into the URL. We deliberately don't put the temp id in the URL.
      const id = crypto.randomUUID();
      setActive(id);
      setForm(newForm);
      setStep(1);
      router.replace(`/add-property?step=1`);
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

  async function handleResumeDraft(id: string) {
    // Pull the draft + its staged files from the server so Step 4 rehydrates with the uploaded
    // photos/documents (the local draft record holds text only).
    const res = await getPropertyDraftAction(id);
    if (!res.ok) return;
    const media = mediaFromFiles(res.data.files);
    const step = res.data.draft.step as Step;
    setForm({ ...defaultForm, ...(res.data.draft.form as Partial<FormData>), ...media });
    setStep(step);
    setActive(id);
    router.replace(`/add-property?step=${step}&draftId=${id}`);
  }

  function handleSaveAsDraft() {
    if (activeId) {
      upsert(activeId, form, step);
    }
    router.push("/portfolio");
  }

  async function handleSubmit() {
    // Capture the draft id, then clearActive() up front: it cancels any queued autosave and nulls
    // activeId, so a late autosave can't re-create the draft after the submit converts + deletes it
    // (a zombie draft). On failure we restore activeId so a retry still targets the same draft.
    const draftId = activeId;
    clearActive();
    setSubmitting(true);
    setSubmitError(null);
    setUploadNotice(null);
    try {
      // Resolve the cover photo URL now — submitPropertyAction deletes draft file rows,
      // so any post-submit fetch would find the row gone.
      const firstPhoto = form.stagedPhotos?.[0];
      if (firstPhoto?.id.startsWith("DRFF-")) {
        const urlRes = await getDraftFileUrlAction(firstPhoto.id);
        if (urlRes.ok) setSuccessCoverUrl(urlRes.data);
      }

      // Create the property + convert the draft's staged files into its documents (server-side,
      // reusing each storageId; draft rows are then deleted, S3 objects kept).
      const result = await submitPropertyAction(form, draftId ?? undefined);
      if (!result.ok) {
        if (draftId) setActive(draftId);
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (result.fileNotice) setUploadNotice(result.fileNotice);
      if (result.propertyCode) {
        setForm((f) => ({ ...f, confirmedCode: result.propertyCode! }));
      }
      setStep(6);
    } catch {
      if (draftId) setActive(draftId);
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


        {/* Advisor modal — shown over Step0 on first visit. On phone it
            renders as a full-screen bottom sheet via PhoneSheet; on
            tablet+ it's a centered dialog. Radix handles its own
            mount/unmount + close animation, so we drop AnimatePresence. */}
        {step === 0 && (
          <AdvisorModal
            open={advisorModalOpen}
            onOpenChange={setAdvisorModalOpen}
            onSetupWithAdvisor={() => setAdvisorModalOpen(false)}
            onSetupOwn={() => setAdvisorModalOpen(false)}
          />
        )}

        {/* Content */}
        {step === 6 ? (
          <div ref={successScrollRef} className="flex-1 overflow-auto">
            {uploadNotice && (
              <div className="max-w-[1160px] mx-auto px-4 sm:px-8 pt-4">
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {uploadNotice}
                </div>
              </div>
            )}
            <Step6Success form={form} coverUrl={successCoverUrl} />
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
              {step === 4 && <Step4PhotosDocs form={form} setForm={setForm} draftId={activeId} />}
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

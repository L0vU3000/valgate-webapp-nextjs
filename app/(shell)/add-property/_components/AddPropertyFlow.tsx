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
import { Step0NewOrDraft } from "./Step0NewOrDraft";
import { Step1PropertyType } from "./Step1PropertyType";
import { Step2BasicInfo } from "./Step2BasicInfo";
import { Step3Financial } from "./Step3Financial";
import { Step4PhotosDocs } from "./Step4PhotosDocs";
import { Step5Review } from "./Step5Review";
import { Step6Success } from "./Step6Success";

export function AddPropertyFlow({ drafts }: { drafts: PropertyDraftSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { drafts: localDrafts, activeId, mounted, setActive, upsert, remove, clearActive } =
    useDrafts();

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const latestFormRef = useRef<FormData>(defaultForm);

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
        return;
      }
    }
    if (urlStep >= 1 && urlStep <= 6) {
      setStep(urlStep);
    }
  // Run once after mount; searchParams and localDrafts are stable at that point
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Autosave form changes while on steps 1–5
  useEffect(() => {
    if (!mounted || !activeId || step < 1 || step > 5) return;
    upsert(activeId, form, step);
  }, [form, step, activeId, mounted, upsert]);

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

  const goNext = () => setStep((s) => Math.min(s + 1, 6) as Step);
  const goBack = () => setStep((s) => Math.max(s - 1, 0) as Step);

  function handleSetFormFromStep0(f: FormData) {
    latestFormRef.current = f;
    setForm(f);
  }
  function handleContinueFromStep0() {
    advanceToStep1(latestFormRef.current);
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
    const result = await submitPropertyAction(form);
    if (result.ok) {
      clearActive();
      setStep(6);
    }
  }

  const progressPercent = step === 0 ? 0 : (step / 6) * 100;

  return (
    <div className="h-full flex flex-col">
      <AppHeader />
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Header — steps 1–5 */}
        {step >= 1 && step <= 5 && (
          <div className="px-8 pt-8 pb-0 shrink-0">
            <div className="max-w-[1160px] mx-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
                    <span className="text-xs text-slate-300">/</span>
                    <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Add Property</span>
                  </div>
                  <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">
                    Add New Property
                  </h1>
                </div>
                <button
                  onClick={handleSaveAsDraft}
                  className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50 shrink-0 mt-1"
                >
                  Save as Draft
                </button>
              </div>
              <div className="w-full h-2 bg-[#E8EAED] rounded-full mb-2">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-primary text-[14px] mb-6" style={{ fontWeight: 500 }}>
                Step {step} of 6: {stepLabels[step]}
              </p>
            </div>
          </div>
        )}


        {/* Header — step 6 */}
        {step === 6 && (
          <div className="px-8 pt-8 shrink-0">
            <div className="max-w-[1160px] mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Add Property</span>
              </div>
              <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">
                Add New Property
              </h1>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-8 pb-4 overflow-auto">
          <div className="max-w-[1160px] mx-auto">
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
              />
            )}
            {step === 1 && <Step1PropertyType form={form} setForm={setForm} />}
            {step === 2 && <Step2BasicInfo form={form} setForm={setForm} />}
            {step === 3 && <Step3Financial form={form} setForm={setForm} />}
            {step === 4 && <Step4PhotosDocs form={form} setForm={setForm} />}
            {step === 5 && <Step5Review form={form} />}
            {step === 6 && <Step6Success />}
          </div>
        </div>

        {/* Footer — steps 1–5 */}
        {step >= 1 && step <= 5 && (
          <div className="px-8 py-4 border-t border-border shrink-0">
            <div className="max-w-[1160px] mx-auto flex items-center justify-between">
              <button
                onClick={handleSaveAsDraft}
                className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50"
              >
                Save as Draft
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={goBack}
                  className="border border-border rounded-lg px-6 py-2 text-[14px] text-foreground hover:bg-accent/50"
                >
                  Go Back
                </button>
                {step < 5 ? (
                  <button
                    onClick={goNext}
                    className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

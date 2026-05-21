"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { WizardProgress } from "./WizardProgress";
import type { WizardProgressStep } from "./WizardProgress";
import { VerificationStep } from "./VerificationStep";
import type { WizardConfig } from "./types";
import type { ZodTypeAny } from "zod";

interface FeatureUnlockWizardProps<TSchema extends ZodTypeAny> {
  config: WizardConfig<TSchema>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  startAt?: "data" | "verification";
  onSuccess?: () => void;
}

export function FeatureUnlockWizard<TSchema extends ZodTypeAny>({
  config,
  open,
  onOpenChange,
  propertyId,
  startAt = "data",
  onSuccess,
}: FeatureUnlockWizardProps<TSchema>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type FormValues = any;

  const [phase, setPhase] = useState<"loading" | "load-error" | "data" | "verification" | "done">("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didChange, setDidChange] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(config.schema as any) as any,
    defaultValues: {} as FormValues,
  });

  const loadData = useCallback(() => {
    setPhase("loading");
    setError(null);
    setDidChange(false);
    setStepIndex(0);

    config
      .loadInitial({ propertyId })
      .then((initial) => {
        form.reset(initial.values as FormValues);
        setEntityId(initial.entityId);
        if (startAt === "verification" && initial.entityId) {
          setPhase("verification");
        } else {
          setPhase("data");
          setStepIndex(0);
        }
      })
      .catch(() => {
        setPhase("load-error");
      });
  }, [config, form, propertyId, startAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentValues = form.watch();
  const allSteps = config.steps;

  function findNextStep(fromIndex: number): number | null {
    let next = fromIndex + 1;
    while (next < allSteps.length) {
      if (!allSteps[next].shouldSkip?.(currentValues)) return next;
      next++;
    }
    return null;
  }

  function findPrevStep(fromIndex: number): number | null {
    let prev = fromIndex - 1;
    while (prev >= 0) {
      if (!allSteps[prev].shouldSkip?.(currentValues)) return prev;
      prev--;
    }
    return null;
  }

  async function handleNext() {
    const currentStep = allSteps[stepIndex];
    if (!currentStep) return;
    const valid = await form.trigger(currentStep.fields as any);
    if (!valid) {
      setError("Some fields on this step are invalid. Check the values above and try again.");
      return;
    }
    setError(null);
    const nextIndex = findNextStep(stepIndex);
    if (nextIndex !== null) {
      setStepIndex(nextIndex);
    } else {
      await handleSubmitData();
    }
  }

  async function handleSubmitData() {
    setSubmitting(true);
    setError(null);
    try {
      // getValues() returns raw input strings for empty number fields; parse through
      // the wizard schema so coercions match what step validation already applied.
      const parsed = config.schema.safeParse(form.getValues());
      if (!parsed.success) {
        setError("Some fields have invalid values. Review the steps above and try again.");
        setSubmitting(false);
        return;
      }
      const result = await config.onSubmitData({
        values: parsed.data,
        propertyId,
        entityId,
      });
      if (!result.ok) {
        setError("Couldn't save your changes. Check your connection and try again.");
        setSubmitting(false);
        return;
      }
      setEntityId(result.data.entityId);
      setDidChange(true);
      if (config.verification) {
        setPhase("verification");
      } else {
        setPhase("done");
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      setError("Couldn't save your changes. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (phase === "verification") {
      setPhase("data");
      let last = allSteps.length - 1;
      while (last > 0 && allSteps[last].shouldSkip?.(currentValues)) last--;
      setStepIndex(last);
      return;
    }
    const prevIndex = findPrevStep(stepIndex);
    if (prevIndex !== null) setStepIndex(prevIndex);
  }

  function handleVerificationComplete() {
    setDidChange(true);
    setPhase("done");
    onOpenChange(false);
    onSuccess?.();
  }

  function handleClose() {
    onOpenChange(false);
    if (didChange) onSuccess?.();
  }

  const currentStep = allSteps[stepIndex];
  const isFirstStep = phase === "data" && findPrevStep(stepIndex) === null;
  const isLastDataStep = phase === "data" && findNextStep(stepIndex) === null;

  // Count only navigable steps for the "X of Y" label
  const navigableCount = allSteps.filter((s) => !s.shouldSkip?.(currentValues)).length;
  const navigablePosition = allSteps
    .slice(0, stepIndex + 1)
    .filter((s) => !s.shouldSkip?.(currentValues)).length;

  function getDataStepStatus(stepIndexInConfig: number): WizardProgressStep["status"] {
    const step = allSteps[stepIndexInConfig];
    if (step?.shouldSkip?.(currentValues)) return "skipped";
    if (phase === "verification" || phase === "done") return "completed";
    if (stepIndexInConfig === stepIndex && phase === "data") return "active";
    if (stepIndexInConfig < stepIndex) return "completed";
    return "pending";
  }

  const progressSteps: WizardProgressStep[] = allSteps.map((step, i) => ({
    key: step.key,
    title: step.title,
    status: getDataStepStatus(i),
  }));

  if (config.verification) {
    progressSteps.push({
      key: "__verification",
      title: config.verification.title,
      status: (
        phase === "verification" ? "active" : phase === "done" ? "completed" : "pending"
      ) as WizardProgressStep["status"],
    });
  }

  const gradientStyle = {
    background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
    boxShadow: "0 4px 6px -1px rgba(0,74,198,0.20)",
  };

  // Keep closed wizards out of the SSR tree so Radix useId counters match on hydrate.
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/*
        max-w-[860px]  — wider than 2xl so the loan grid breathes
        min-h-[660px]  — tall enough for the co-owners step with a few rows
        max-h-[88vh]   — never taller than the viewport
      */}
      <DialogContent className="max-w-[860px] sm:max-w-[860px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{config.title}</DialogTitle>

        <div className="flex min-h-[660px] max-h-[88vh]">

          {/* ── Left rail ── */}
          <div
            className="w-[216px] shrink-0 flex flex-col border-r border-slate-200 overflow-y-auto"
            style={{ background: "oklch(97% 0.005 250)" }}
          >
            {/* Pillar identity */}
            <div className="px-6 pt-8 pb-6 border-b border-slate-200/70">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                {config.pillarKey}
              </p>
              <h2 className="text-[16px] font-bold text-val-heading leading-snug">
                {config.title}
              </h2>
            </div>

            {/* Progress */}
            <div className="px-6 pt-6 flex-1">
              <WizardProgress steps={progressSteps} />
            </div>
          </div>

          {/* ── Right body ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">

            {/* Loading */}
            {phase === "loading" && (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-[var(--val-primary-dark)] rounded-full animate-spin" />
              </div>
            )}

            {/* Load error — full-panel block so user can't try to proceed with empty data */}
            {phase === "load-error" && (
              <div className="flex-1 flex flex-col items-center justify-center px-10 text-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-val-heading mb-1">
                    Couldn&apos;t load your financial data
                  </p>
                  <p className="text-[13px] text-slate-500 max-w-[320px]">
                    This is usually a temporary connection issue. Try again — your saved data won&apos;t be lost.
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="px-5 py-2.5 text-[14px] font-semibold text-white rounded-lg transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
                  style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
                >
                  Try again
                </button>
                <button
                  onClick={handleClose}
                  className="text-[13px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {/* Data steps */}
            {phase === "data" && currentStep && (
              <>
                {/* Step header */}
                <div className="px-10 pt-8 pb-6 border-b border-slate-100 shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--val-primary-dark)] mb-2">
                    {String(navigablePosition).padStart(2, "0")} / {String(navigableCount).padStart(2, "0")}
                  </p>
                  <h3 className="text-[22px] font-bold text-val-heading leading-tight">
                    {currentStep.title}
                  </h3>
                  {currentStep.description && (
                    <p className="text-[14px] text-slate-500 mt-1.5 leading-relaxed">
                      {currentStep.description}
                    </p>
                  )}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-10 py-7">
                  {error && (
                    <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-red-700 leading-snug">
                          Couldn&apos;t save your changes
                        </p>
                        <p className="text-[12px] text-red-600 mt-0.5 leading-snug">
                          Check your connection, double-check the values above, and try saving again.
                        </p>
                      </div>
                      <button
                        onClick={() => setError(null)}
                        className="shrink-0 text-red-400 hover:text-red-600 transition-colors mt-0.5"
                        aria-label="Dismiss error"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {currentStep.render({ form: form as any, values: currentValues, propertyId })}
                </div>

                {/* Footer */}
                <div className="px-10 py-5 border-t border-slate-100 flex items-center justify-between shrink-0">
                  <button
                    onClick={handleBack}
                    disabled={isFirstStep || submitting}
                    className="px-4 py-2 text-[13px] font-semibold text-slate-500 hover:text-val-heading disabled:opacity-30 disabled:pointer-events-none transition-colors duration-150"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={submitting}
                    className="px-6 py-2.5 text-[14px] font-semibold text-white rounded-lg flex items-center gap-2 disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
                    style={gradientStyle}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : isLastDataStep ? (
                      config.verification ? "Save & verify →" : "Save"
                    ) : (
                      "Continue →"
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Verification step */}
            {phase === "verification" && config.verification && entityId && (
              <VerificationStep
                propertyId={propertyId}
                entityId={entityId}
                config={config.verification}
                onBack={handleBack}
                onComplete={handleVerificationComplete}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

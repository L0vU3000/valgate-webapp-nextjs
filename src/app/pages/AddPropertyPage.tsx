import { useState } from "react";
import type { Step } from "./add-property/types";
import { defaultForm, stepLabels } from "./add-property/types";
import type { FormData } from "./add-property/types";
import { Step0NewOrDraft } from "./add-property/Step0NewOrDraft";
import { Step1PropertyType } from "./add-property/Step1PropertyType";
import { Step2BasicInfo } from "./add-property/Step2BasicInfo";
import { Step3Financial } from "./add-property/Step3Financial";
import { Step4PhotosDocs } from "./add-property/Step4PhotosDocs";
import { Step5Review } from "./add-property/Step5Review";
import { Step6Success } from "./add-property/Step6Success";

export function AddPropertyPage() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>(defaultForm);

  const goNext = () => setStep((s) => Math.min(s + 1, 6) as Step);
  const goBack = () => setStep((s) => Math.max(s - 1, 0) as Step);

  const progressPercent = step === 0 ? 0 : (step / 6) * 100;

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header - only show for steps 1-5 */}
      {step >= 1 && step <= 5 && (
        <div className="px-8 pt-8 pb-0 shrink-0">
          <div className="max-w-[1160px] mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-[30px] text-[#6B7684] font-display" style={{ fontWeight: 600 }}>
                Add New Property
              </h1>
              <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50">
                Save as Draft
              </button>
            </div>
            {/* Progress bar */}
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

      {/* Step 0: Title only */}
      {step === 0 && (
        <div className="px-8 pt-8 pb-[77px] shrink-0">
          <div className="max-w-[1160px] mx-auto">
            <h1 className="text-[30px] text-[#6B7684] font-display" style={{ fontWeight: 600 }}>
              Add New Property
            </h1>
          </div>
        </div>
      )}

      {/* Step 6: Title only */}
      {step === 6 && (
        <div className="px-8 pt-8 shrink-0">
          <div className="max-w-[1160px] mx-auto">
            <h1 className="text-[30px] text-[#6B7684] font-display" style={{ fontWeight: 600 }}>
              Add New Property
            </h1>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-8 pb-4 overflow-auto">
        <div className="max-w-[1160px] mx-auto">
        {step === 0 && <Step0NewOrDraft form={form} setForm={setForm} onContinue={goNext} />}
        {step === 1 && <Step1PropertyType form={form} setForm={setForm} />}
        {step === 2 && <Step2BasicInfo form={form} setForm={setForm} />}
        {step === 3 && <Step3Financial form={form} setForm={setForm} />}
        {step === 4 && <Step4PhotosDocs form={form} setForm={setForm} />}
        {step === 5 && <Step5Review form={form} />}
        {step === 6 && <Step6Success />}
        </div>
      </div>

      {/* Footer - steps 1-5 */}
      {step >= 1 && step <= 5 && (
        <div className="px-8 py-4 border-t border-border shrink-0">
          <div className="max-w-[1160px] mx-auto flex items-center justify-between">
            <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50">
              Save as Draft
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={goBack}
                className="border border-border rounded-lg px-6 py-2 text-[14px] text-foreground hover:bg-accent/50"
              >
                Go Back
              </button>
              <button
                onClick={goNext}
                className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

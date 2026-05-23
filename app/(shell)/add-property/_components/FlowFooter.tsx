export function FlowFooter({
  onBack,
  onSaveDraft,
  onContinue,
  onSubmit,
  isFinalStep,
  submitting = false,
  stepError = null,
  submitError = null,
}: {
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  onSubmit: () => void;
  isFinalStep: boolean;
  submitting?: boolean;
  stepError?: string | null;
  submitError?: string | null;
}) {
  return (
    <div className="px-8 py-4 border-t border-border bg-white shrink-0">
      <div className="max-w-[1160px] mx-auto flex items-center justify-between">
        <button
          onClick={onSaveDraft}
          className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50"
        >
          Save as Draft
        </button>
        <div className="flex items-center gap-3">
          {!isFinalStep && stepError && (
            <p className="text-[13px] text-destructive">{stepError}</p>
          )}
          {isFinalStep && submitError && (
            <p className="text-[13px] text-destructive">{submitError}</p>
          )}
          <button
            onClick={onBack}
            className="border border-border rounded-lg px-6 py-2 text-[14px] text-foreground hover:bg-accent/50"
          >
            Go Back
          </button>
          {isFinalStep ? (
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          ) : (
            <button
              onClick={onContinue}
              className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

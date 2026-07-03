import { ChevronLeft } from "lucide-react";

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
  const error = !isFinalStep ? stepError : submitError;
  const primaryLabel = isFinalStep
    ? submitting
      ? "Submitting…"
      : "Submit"
    : "Continue";
  const onPrimary = isFinalStep ? onSubmit : onContinue;

  return (
    <div className="sticky bottom-0 sm:static z-10 bg-white/95 backdrop-blur sm:backdrop-blur-0 sm:bg-white border-t border-border px-4 sm:px-8 pt-3 pb-safe sm:py-4 shrink-0">
      <div className="max-w-[1160px] mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {error && (
          <p
            role="alert"
            className="text-[13px] text-destructive order-first sm:order-none sm:hidden"
          >
            {error}
          </p>
        )}

        <button
          onClick={onSaveDraft}
          className="hidden sm:inline-flex border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50"
        >
          Save as Draft
        </button>
        <button
          onClick={onSaveDraft}
          className="sm:hidden self-center text-[14px] text-secondary underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Save as Draft
        </button>

        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="hidden sm:block text-[13px] text-destructive">
              {error}
            </p>
          )}

          <button
            onClick={onBack}
            aria-label="Go back"
            className="sm:hidden flex size-11 items-center justify-center rounded-full border border-border text-foreground hover:bg-accent/50 transition-colors shrink-0"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={onBack}
            className="hidden sm:inline-flex border border-border rounded-lg px-6 py-2 text-[14px] text-foreground hover:bg-accent/50"
          >
            Go Back
          </button>

          <button
            onClick={onPrimary}
            disabled={submitting}
            className="flex-1 sm:flex-initial h-12 sm:h-auto rounded-full sm:rounded-lg bg-primary text-white px-6 sm:py-2 text-[15px] sm:text-[14px] font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

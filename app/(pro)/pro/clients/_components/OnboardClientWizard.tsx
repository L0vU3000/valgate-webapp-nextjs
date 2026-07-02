"use client";

// OnboardClientWizard — 4-step "create a portfolio + invite people" flow.
//
// Step 1: Portfolio name
// Step 2: People — repeatable { email, role, name? } rows (monday.com-style)
// Step 3: Properties — sketch new or assign existing
// Step 4: Review — dual CTA: "Create portfolio" (drafts only) / "Create & invite now"
//
// On D2 (onComplete provided): always sends invitations, then calls onComplete(orgId, name)
// so the parent (AddPropertyFlowPro) can resume immediately.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Check, ArrowLeft } from "lucide-react";
import { createPortfolioAction } from "@/app/(pro)/pro/portfolio.actions";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalSuccess,
  proInputClass,
  proSelectClass,
  proPrimaryButtonClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import { RoleSelect } from "./RoleSelect";
import { cn } from "@/components/ui/utils";
import type { PortfolioRole } from "@/lib/services/client-onboarding";

type PropertyStub = {
  name: string;
  type: string;
  value?: number;
};

type Invitee = {
  email: string;
  role: PortfolioRole;
  name: string;
};

type ManagerAccessModel = "approval" | "full" | "remove";

type WizardState = {
  step: 1 | 2 | 3 | 4;
  portfolioName: string;
  invitees: Invitee[];
  propertyStubs: PropertyStub[];
  assignPropertyIds: string[];
  locale: "en" | "km";
  managerAccessModel: ManagerAccessModel;
};

const INITIAL_STATE: WizardState = {
  step: 1,
  portfolioName: "",
  invitees: [{ email: "", role: "admin", name: "" }],
  propertyStubs: [],
  assignPropertyIds: [],
  locale: "en",
  managerAccessModel: "approval",
};

const PROPERTY_TYPE_OPTIONS = ["Residential", "Commercial", "Land"] as const;

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// Shared wizard state factory, used by both OnboardClientWizard and OnboardClientFlow.
function useWizardState() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  function patch(next: Partial<WizardState>) {
    setState((s) => ({ ...s, ...next }));
  }

  function resetAll() {
    setState(INITIAL_STATE);
    setError(null);
    setShowSuccess(false);
    setSuccessMessage("");
  }

  function goToStep(step: WizardState["step"]) {
    setError(null);
    patch({ step });
  }

  function addInviteeRow() {
    patch({ invitees: [...state.invitees, { email: "", role: "member", name: "" }] });
  }

  function updateInvitee(index: number, next: Partial<Invitee>) {
    patch({ invitees: state.invitees.map((row, i) => (i === index ? { ...row, ...next } : row)) });
  }

  function removeInvitee(index: number) {
    patch({ invitees: state.invitees.filter((_, i) => i !== index) });
  }

  function addPropertyRow() {
    patch({ propertyStubs: [...state.propertyStubs, { name: "", type: "Residential" }] });
  }

  function updatePropertyRow(index: number, next: Partial<PropertyStub>) {
    patch({ propertyStubs: state.propertyStubs.map((r, i) => (i === index ? { ...r, ...next } : r)) });
  }

  function removePropertyRow(index: number) {
    patch({ propertyStubs: state.propertyStubs.filter((_, i) => i !== index) });
  }

  function toggleAssigned(id: string) {
    const cur = state.assignPropertyIds;
    patch({ assignPropertyIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  }

  return {
    state, isPending, error, showSuccess, successMessage, startTransition,
    setError, setShowSuccess, setSuccessMessage,
    patch, resetAll, goToStep,
    addInviteeRow, updateInvitee, removeInvitee,
    addPropertyRow, updatePropertyRow, removePropertyRow, toggleAssigned,
  };
}

// Flowing inside AddClientModal — no ProModal wrapper, receives an onBack callback
// for the back-to-chooser arrow in step 1.
export function OnboardClientFlow({
  onBack,
  unassignedProperties,
}: {
  onBack: () => void;
  unassignedProperties: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const w = useWizardState();

  function submit(sendNow: boolean) {
    w.setError(null);
    const validInvitees = w.state.invitees.filter((r) => isValidEmail(r.email));
    const stubs = w.state.propertyStubs
      .filter((r) => r.name.trim() !== "")
      .map((r) => ({ name: r.name.trim(), type: r.type, value: r.value }));

    w.startTransition(async () => {
      const result = await createPortfolioAction({
        portfolioName: w.state.portfolioName.trim(),
        invitees: validInvitees.map((r) => ({
          email: r.email.trim(),
          role: r.role,
          name: r.name.trim() || undefined,
        })),
        propertyStubs: stubs,
        assignPropertyIds: w.state.assignPropertyIds,
        locale: w.state.locale,
        sendNow,
        managerAccessModel: w.state.managerAccessModel,
      });

      if (result.ok) {
        router.refresh();
        // Three outcomes: a draft with nobody invited, invitations emailed now, or
        // draft handoffs saved for specific people to send later.
        let message: string;
        if (validInvitees.length === 0) {
          message = "Draft portfolio created — invite the client when you're ready";
        } else if (sendNow) {
          message = `Portfolio created · ${validInvitees.length} invitation${validInvitees.length === 1 ? "" : "s"} sent`;
        } else {
          message = `Portfolio created · ${validInvitees.length} draft invitation${validInvitees.length === 1 ? "" : "s"} saved`;
        }
        w.setSuccessMessage(message);
        w.setShowSuccess(true);
      } else {
        w.setError(result.error);
      }
    });
  }

  // Blank is valid — the server defaults the name to "<client name> Portfolio".
  // Otherwise require at least 2 characters so a stray keystroke isn't the name.
  const trimmedName = w.state.portfolioName.trim();
  const step1Valid = trimmedName.length === 0 || trimmedName.length >= 2;
  const validInvitees = w.state.invitees.filter((r) => isValidEmail(r.email));
  // Draft-capable flow: zero invitees is allowed (it creates a draft portfolio to
  // invite into later). Only block "Next" if a row has text that isn't a valid email.
  const step2Valid = w.state.invitees.every(
    (r) => r.email.trim() === "" || isValidEmail(r.email),
  );
  const totalProperties =
    w.state.propertyStubs.filter((r) => r.name.trim() !== "").length +
    w.state.assignPropertyIds.length;

  return (
    <div className="flex flex-col gap-5">
      {w.showSuccess ? (
        <ProModalSuccess message={w.successMessage} onComplete={() => {}} />
      ) : (
        <>
          {/* Back-to-chooser arrow */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to method chooser"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <ProgressStepper step={w.state.step} />

          {w.state.step === 1 && (
            <StepOne
              portfolioName={w.state.portfolioName}
              onChange={(v) => w.patch({ portfolioName: v })}
              onNext={() => w.goToStep(2)}
              onCancel={() => {}} // Cancel is hidden because wrapper controls close
              nextDisabled={!step1Valid}
              hideCancel
            />
          )}

          {w.state.step === 2 && (
            <StepTwo
              invitees={w.state.invitees}
              onAdd={w.addInviteeRow}
              onUpdate={w.updateInvitee}
              onRemove={w.removeInvitee}
              onNext={() => w.goToStep(3)}
              onBack={() => w.goToStep(1)}
              onCancel={() => {}}
              nextDisabled={!step2Valid}
              optional
            />
          )}

          {w.state.step === 3 && (
            <StepThree
              state={w.state}
              unassignedProperties={unassignedProperties}
              onAddRow={w.addPropertyRow}
              onUpdateRow={w.updatePropertyRow}
              onRemoveRow={w.removePropertyRow}
              onToggleAssigned={w.toggleAssigned}
              onNext={() => w.goToStep(4)}
              onSkip={() => w.goToStep(4)}
              onBack={() => w.goToStep(2)}
              onCancel={() => {}}
            />
          )}

          {w.state.step === 4 && (
            <StepFour
              state={w.state}
              validInvitees={validInvitees}
              totalProperties={totalProperties}
              error={w.error}
              isPending={w.isPending}
              showDualCta
              onLocaleChange={(v) => w.patch({ locale: v })}
              onAccessModelChange={(v) => w.patch({ managerAccessModel: v })}
              onSubmit={submit}
              onBack={() => w.goToStep(3)}
              onCancel={() => {}}
            />
          )}
        </>
      )}
    </div>
  );
}

export function OnboardClientWizard({
  open,
  onOpenChange,
  unassignedProperties,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedProperties: Array<{ id: string; name: string }>;
  onComplete?: (orgId: string, portfolioName: string) => void;
}) {
  const router = useRouter();
  const w = useWizardState();

  function handleOpenChange(next: boolean) {
    if (!next) w.resetAll();
    onOpenChange(next);
  }

  function submit(sendNow: boolean) {
    w.setError(null);
    const validInvitees = w.state.invitees.filter((r) => isValidEmail(r.email));
    const stubs = w.state.propertyStubs
      .filter((r) => r.name.trim() !== "")
      .map((r) => ({ name: r.name.trim(), type: r.type, value: r.value }));

    w.startTransition(async () => {
      const result = await createPortfolioAction({
        portfolioName: w.state.portfolioName.trim(),
        invitees: validInvitees.map((r) => ({
          email: r.email.trim(),
          role: r.role,
          name: r.name.trim() || undefined,
        })),
        propertyStubs: stubs,
        assignPropertyIds: w.state.assignPropertyIds,
        locale: w.state.locale,
        sendNow: onComplete ? true : sendNow,
        managerAccessModel: w.state.managerAccessModel,
      });

      if (result.ok) {
        router.refresh();
        if (onComplete && result.orgId) {
          onComplete(result.orgId, w.state.portfolioName.trim() || "New portfolio");
          handleOpenChange(false);
        } else {
          w.setSuccessMessage(
            sendNow
              ? `Portfolio created · ${validInvitees.length} invitation${validInvitees.length === 1 ? "" : "s"} sent`
              : `Portfolio created · ${validInvitees.length} draft invitation${validInvitees.length === 1 ? "" : "s"} saved`,
          );
          w.setShowSuccess(true);
        }
      } else {
        w.setError(result.error);
      }
    });
  }

  // Blank is valid — the server defaults the name to "<client name> Portfolio".
  // Otherwise require at least 2 characters so a stray keystroke isn't the name.
  const trimmedName = w.state.portfolioName.trim();
  const step1Valid = trimmedName.length === 0 || trimmedName.length >= 2;
  const validInvitees = w.state.invitees.filter((r) => isValidEmail(r.email));
  const step2Valid = validInvitees.length >= 1;
  const totalProperties =
    w.state.propertyStubs.filter((r) => r.name.trim() !== "").length +
    w.state.assignPropertyIds.length;

  return (
    <ProModal
      open={open}
      onOpenChange={handleOpenChange}
      title="New client portfolio"
      description="Create a portfolio, add people, and optionally seed properties."
    >
      {w.showSuccess ? (
        <ProModalSuccess message={w.successMessage} onComplete={() => handleOpenChange(false)} />
      ) : (
        <div className="flex flex-col gap-5">
          <ProgressStepper step={w.state.step} />

          {w.state.step === 1 && (
            <StepOne
              portfolioName={w.state.portfolioName}
              onChange={(v) => w.patch({ portfolioName: v })}
              onNext={() => w.goToStep(2)}
              onCancel={() => handleOpenChange(false)}
              nextDisabled={!step1Valid}
            />
          )}

          {w.state.step === 2 && (
            <StepTwo
              invitees={w.state.invitees}
              onAdd={w.addInviteeRow}
              onUpdate={w.updateInvitee}
              onRemove={w.removeInvitee}
              onNext={() => w.goToStep(3)}
              onBack={() => w.goToStep(1)}
              onCancel={() => handleOpenChange(false)}
              nextDisabled={!step2Valid}
            />
          )}

          {w.state.step === 3 && (
            <StepThree
              state={w.state}
              unassignedProperties={unassignedProperties}
              onAddRow={w.addPropertyRow}
              onUpdateRow={w.updatePropertyRow}
              onRemoveRow={w.removePropertyRow}
              onToggleAssigned={w.toggleAssigned}
              onNext={() => w.goToStep(4)}
              onSkip={() => w.goToStep(4)}
              onBack={() => w.goToStep(2)}
              onCancel={() => handleOpenChange(false)}
            />
          )}

          {w.state.step === 4 && (
            <StepFour
              state={w.state}
              validInvitees={validInvitees}
              totalProperties={totalProperties}
              error={w.error}
              isPending={w.isPending}
              showDualCta={!onComplete}
              onLocaleChange={(v) => w.patch({ locale: v })}
              onAccessModelChange={(v) => w.patch({ managerAccessModel: v })}
              onSubmit={submit}
              onBack={() => w.goToStep(3)}
              onCancel={() => handleOpenChange(false)}
            />
          )}
        </div>
      )}
    </ProModal>
  );
}

// ── Progress stepper ─────────────────────────────────────────────────────────

function ProgressStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {([1, 2, 3, 4] as const).map((dot) => {
          const completed = dot < step;
          const active = dot === step;
          return (
            <span
              key={dot}
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                completed && "border-emerald-500 bg-emerald-500 text-white",
                active && "border-blue-600 bg-blue-600 text-white",
                !completed && !active && "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500",
              )}
            >
              {completed ? <Check className="h-3 w-3" strokeWidth={3} /> : dot}
            </span>
          );
        })}
      </div>
      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
        Step {step} of 4
      </span>
    </div>
  );
}

function TextLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      {children}
    </button>
  );
}

// ── Step 1 — Portfolio name ───────────────────────────────────────────────────

function StepOne({
  portfolioName,
  onChange,
  onNext,
  onCancel,
  nextDisabled,
  hideCancel,
}: {
  portfolioName: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onCancel: () => void;
  nextDisabled: boolean;
  hideCancel?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ProField
        label="Portfolio name (optional)"
        htmlFor="wizard-portfolio"
        hint="Leave blank to default to the client's name — e.g. “Sokha Portfolio”. This becomes the org name visible to all members."
      >
        <input
          id="wizard-portfolio"
          type="text"
          autoFocus
          value={portfolioName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Sokha Family Office"
          className={proInputClass}
        />
      </ProField>

      <div className="flex items-center justify-between pt-1">
        {!hideCancel && <TextLink onClick={onCancel}>Cancel</TextLink>}
        {hideCancel && <span />}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={proPrimaryButtonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Step 2 — People ───────────────────────────────────────────────────────────

function StepTwo({
  invitees,
  onAdd,
  onUpdate,
  onRemove,
  onNext,
  onBack,
  onCancel,
  nextDisabled,
  optional = false,
}: {
  invitees: Invitee[];
  onAdd: () => void;
  onUpdate: (i: number, patch: Partial<Invitee>) => void;
  onRemove: (i: number) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  nextDisabled: boolean;
  // When true, this step can be left empty — the portfolio is created as a draft and
  // the manager invites people later. Only used by the draft-capable OnboardClientFlow.
  optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
          {optional ? "Invite people (optional)" : "People"}
        </h3>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
          {optional
            ? "Add people now, or leave this empty and invite them later. You can adjust roles anytime."
            : "Add everyone who should have access. You can adjust roles later."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <span className="pl-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Email
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Role
          </span>
          <span className="w-9" />
        </div>

        {invitees.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
            <input
              type="email"
              value={row.email}
              onChange={(e) => onUpdate(index, { email: e.target.value })}
              placeholder="owner@example.com"
              className={cn(proInputClass, "text-[12.5px]")}
            />
            {index === 0 ? (
              // Primary invitee is always admin — they become the portfolio owner on accept.
              <span className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[12.5px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                Admin
              </span>
            ) : (
              <RoleSelect
                value={row.role}
                onChange={(role) => onUpdate(index, { role })}
              />
            )}
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={invitees.length === 1}
              aria-label="Remove"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add another
        </button>
      </div>

      <div className="flex items-center justify-between pt-1">
        <TextLink onClick={onCancel}>Cancel</TextLink>
        <div className="flex items-center gap-4">
          <TextLink onClick={onBack}>Back</TextLink>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className={proPrimaryButtonClass}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — Properties ───────────────────────────────────────────────────────

function StepThree({
  state,
  unassignedProperties,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onToggleAssigned,
  onNext,
  onSkip,
  onBack,
  onCancel,
}: {
  state: WizardState;
  unassignedProperties: Array<{ id: string; name: string }>;
  onAddRow: () => void;
  onUpdateRow: (i: number, patch: Partial<PropertyStub>) => void;
  onRemoveRow: (i: number) => void;
  onToggleAssigned: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
          Portfolio properties
        </h3>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
          Add properties now or later.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {state.propertyStubs.map((row, index) => (
          <div
            key={index}
            className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-700 dark:bg-slate-800/40"
          >
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Name
              </label>
              <input
                type="text"
                value={row.name}
                onChange={(e) => onUpdateRow(index, { name: e.target.value })}
                placeholder="e.g. Riverside Villa"
                className={proInputClass}
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Type
              </label>
              <select
                value={row.type}
                onChange={(e) => onUpdateRow(index, { type: e.target.value })}
                className={proSelectClass}
              >
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Value
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={row.value ?? ""}
                  onChange={(e) =>
                    onUpdateRow(index, {
                      value: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="0"
                  className={cn(proInputClass, "pl-6")}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemoveRow(index)}
              aria-label="Remove property"
              className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddRow}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add property
        </button>
      </div>

      {unassignedProperties.length > 0 && (
        <ProField
          label="Assign existing properties"
          hint={`${state.assignPropertyIds.length} of ${unassignedProperties.length} selected · optional`}
        >
          <div className="flex flex-wrap gap-2">
            {unassignedProperties.map((p) => {
              const selected = state.assignPropertyIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggleAssigned(p.id)}
                  className={
                    selected
                      ? "rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "rounded-full border border-slate-200 px-3 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  }
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </ProField>
      )}

      <div className="flex items-center justify-between pt-1">
        <TextLink onClick={onCancel}>Cancel</TextLink>
        <div className="flex items-center gap-4">
          <TextLink onClick={onBack}>Back</TextLink>
          <TextLink onClick={onSkip}>Skip</TextLink>
          <button type="button" onClick={onNext} className={proPrimaryButtonClass}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 4 — Review + dual CTA ────────────────────────────────────────────────

const ACCESS_MODEL_OPTIONS: Array<{
  value: ManagerAccessModel;
  label: string;
  hint: string;
}> = [
  { value: "approval", label: "Approval (default)", hint: "You become read-only. Client leads." },
  { value: "full", label: "Full access", hint: "You stay co-admin alongside the client." },
  { value: "remove", label: "Remove me", hint: "Your access is removed when they accept." },
];

function StepFour({
  state,
  validInvitees,
  totalProperties,
  error,
  isPending,
  showDualCta,
  onLocaleChange,
  onAccessModelChange,
  onSubmit,
  onBack,
  onCancel,
}: {
  state: WizardState;
  validInvitees: Invitee[];
  totalProperties: number;
  error: string | null;
  isPending: boolean;
  showDualCta: boolean;
  onLocaleChange: (v: "en" | "km") => void;
  onAccessModelChange: (v: ManagerAccessModel) => void;
  onSubmit: (sendNow: boolean) => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  const inviteeSummary = validInvitees.map((i) => i.email).join(", ");
  // No valid invitees → this will be created as a draft (org + properties, no invite).
  const hasInvitees = validInvitees.length > 0;

  // Preview the name the server will use when the manager left the field blank.
  // Mirrors deriveDefaultPortfolioName() in lib/services/client-onboarding.ts
  // (source of truth) — kept simple here since it's display-only.
  const primaryLocalPart = (validInvitees[0]?.email.split("@")[0] ?? "").replace(/[._-]+/g, " ").trim();
  const derivedName = primaryLocalPart
    ? `${primaryLocalPart.charAt(0).toUpperCase()}${primaryLocalPart.slice(1)} Portfolio`
    : "";
  const portfolioPreview = state.portfolioName.trim() || derivedName || "—";

  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <dl className="flex flex-col gap-2 text-[13px]">
          <SummaryRow label="Portfolio" value={portfolioPreview} />
          <SummaryRow
            label="People"
            value={
              hasInvitees
                ? `${validInvitees.length} invitee${validInvitees.length === 1 ? "" : "s"}`
                : "None yet — invite later"
            }
          />
          {validInvitees.length > 0 && (
            <SummaryRow label="" value={inviteeSummary} small />
          )}
          <SummaryRow
            label="Properties"
            value={`${totalProperties} ${totalProperties === 1 ? "property" : "properties"}`}
          />
        </dl>
      </div>

      {/* Manager access model picker */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your access after client accepts
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {ACCESS_MODEL_OPTIONS.map((opt) => {
            const selected = state.managerAccessModel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onAccessModelChange(opt.value)}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors",
                    selected
                      ? "border-blue-600 bg-blue-600"
                      : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                  )}
                />
                <span className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      selected ? "text-blue-700 dark:text-blue-400" : "text-slate-800 dark:text-slate-100",
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invitation language */}
      <ProField label="Invitation language" htmlFor="wizard-locale" hint="Sent to all invitees.">
        <select
          id="wizard-locale"
          value={state.locale}
          onChange={(e) => onLocaleChange(e.target.value as "en" | "km")}
          className={proSelectClass}
        >
          <option value="en">English</option>
          <option value="km">Khmer</option>
        </select>
      </ProField>

      <ProFormError message={error} />

      <div className="flex items-center justify-between pt-1">
        <TextLink onClick={onCancel}>Cancel</TextLink>
        <div className="flex items-center gap-2">
          <TextLink onClick={onBack}>Back</TextLink>

          {showDualCta ? (
            hasInvitees ? (
              <>
                {/* Secondary: save as drafts, no email */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onSubmit(false)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Create portfolio
                </button>
                {/* Primary: send invitations now */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onSubmit(true)}
                  className={proPrimaryButtonClass}
                >
                  {isPending ? "Creating…" : "Create & invite now"}
                </button>
              </>
            ) : (
              // No invitees → draft only. There's no one to email, so the single
              // primary action creates the draft portfolio (sendNow=false).
              <button
                type="button"
                disabled={isPending}
                onClick={() => onSubmit(false)}
                className={proPrimaryButtonClass}
              >
                {isPending ? "Creating…" : "Create portfolio"}
              </button>
            )
          ) : (
            // D2 mode: single CTA, always sends
            <button
              type="button"
              disabled={isPending}
              onClick={() => onSubmit(true)}
              className={proPrimaryButtonClass}
            >
              {isPending ? "Creating…" : "Create & invite now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", small && "mt-[-6px]")}>
      <dt className="shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={cn(
          "text-right font-medium text-slate-800 dark:text-slate-100",
          small && "text-[11.5px] font-normal text-slate-500 dark:text-slate-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

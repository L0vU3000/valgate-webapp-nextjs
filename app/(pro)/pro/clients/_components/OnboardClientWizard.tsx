"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Check } from "lucide-react";
import { motion } from "motion/react";
import { onboardClientPortfolioAction } from "@/app/(pro)/pro/actions";
import {
  ProModal,
  ProField,
  ProFormError,
  ProModalSuccess,
  proInputClass,
  proSelectClass,
  proPrimaryButtonClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import { cn } from "@/components/ui/utils";

// ────────────────────────────────────────────────────────────────────────────
// OnboardClientWizard — the 3-step "invite a client to their portfolio" flow.
// Replaces the legacy single-form OnboardClientModal.
//
// Everything is collected client-side across three steps, then submitted ONCE
// to onboardClientPortfolioAction. That action creates the Clerk org, sends the
// invitation, records the handoff, creates any sketched properties, and assigns
// any selected existing ones.
//
// Same controlled props as the old modal — the parent only owns the open/close
// boolean and supplies the manager's unassigned properties.
//
// Phase 1 note: the action carries one `name` (the portfolio/org + client
// name) plus the property inputs. `portfolioName`, `clientType`, and
// `retainAccess` are gathered for the manager's benefit but are not persisted
// separately yet — same precedent as the original modal's UI-only fields.
// ────────────────────────────────────────────────────────────────────────────

// One sketched property row. `type` holds the human label ("Residential" etc.);
// the server maps it to the internal enum.
type PropertyStub = {
  name: string;
  type: string;
  value?: number;
};

// The whole wizard lives in this single state object, as the design spec asks.
type WizardState = {
  step: 1 | 2 | 3;
  name: string;
  email: string;
  portfolioName: string;
  clientType: "Individual" | "Corporate";
  propertyStubs: PropertyStub[];
  assignPropertyIds: string[];
  role: "full" | "view";
  locale: "en" | "km";
  retainAccess: boolean;
};

const INITIAL_STATE: WizardState = {
  step: 1,
  name: "",
  email: "",
  portfolioName: "",
  clientType: "Individual",
  propertyStubs: [],
  assignPropertyIds: [],
  role: "full",
  locale: "en",
  retainAccess: true,
};

// Property type options for a sketched property row.
const PROPERTY_TYPE_OPTIONS = ["Residential", "Commercial", "Land"] as const;

// A loose email check that mirrors the server's Zod .email() closely enough to
// gate the "Next" button. The server is still the real authority.
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
  // D2: when provided, the wizard calls this instead of showing its own success
  // screen. The parent captures the new org id + client name to continue its flow.
  onComplete?: (orgId: string, clientName: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  // The portfolio name mirrors the client name until the manager edits it
  // directly. This flag remembers whether they've taken it over.
  const [portfolioTouched, setPortfolioTouched] = useState(false);

  // Small helper so every field update reads as one readable line below.
  function patch(next: Partial<WizardState>) {
    setState((current) => ({ ...current, ...next }));
  }

  // Reset everything so the next open starts clean.
  function resetAll() {
    setState(INITIAL_STATE);
    setPortfolioTouched(false);
    setError(null);
    setShowSuccess(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetAll();
    onOpenChange(next);
  }

  // ── Step 1 field handlers ────────────────────────────────────────────────

  function handleNameChange(value: string) {
    // While the manager hasn't customised the portfolio name, keep it in sync
    // with the client name so it has a sensible default.
    if (portfolioTouched) {
      patch({ name: value });
    } else {
      patch({ name: value, portfolioName: value });
    }
  }

  function handlePortfolioChange(value: string) {
    setPortfolioTouched(true);
    patch({ portfolioName: value });
  }

  // ── Step 2: property rows ────────────────────────────────────────────────

  function addPropertyRow() {
    patch({
      propertyStubs: [
        ...state.propertyStubs,
        { name: "", type: "Residential", value: undefined },
      ],
    });
  }

  function updatePropertyRow(index: number, next: Partial<PropertyStub>) {
    const rows = state.propertyStubs.map((row, i) =>
      i === index ? { ...row, ...next } : row,
    );
    patch({ propertyStubs: rows });
  }

  function removePropertyRow(index: number) {
    patch({
      propertyStubs: state.propertyStubs.filter((_, i) => i !== index),
    });
  }

  function toggleAssignedProperty(propertyId: string) {
    const current = state.assignPropertyIds;
    patch({
      assignPropertyIds: current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId],
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  function goToStep(step: WizardState["step"]) {
    setError(null);
    patch({ step });
  }

  // ── Submit (Step 3) ──────────────────────────────────────────────────────

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Drop any half-filled property rows (no name) before sending — they'd
    // only fail server validation.
    const stubs = state.propertyStubs
      .filter((row) => row.name.trim() !== "")
      .map((row) => ({
        name: row.name.trim(),
        type: row.type,
        value: row.value,
      }));

    startTransition(async () => {
      const result = await onboardClientPortfolioAction({
        name: state.name.trim(),
        clientEmail: state.email.trim(),
        role: state.role,
        locale: state.locale,
        propertyStubs: stubs,
        assignPropertyIds: state.assignPropertyIds,
      });

      if (result.ok) {
        if (onComplete && result.orgId) {
          // D2 nested mode: the parent (e.g. AddPropertyFlowPro) captures the new
          // org id + client name and resumes the property wizard immediately.
          onComplete(result.orgId, state.name.trim() || "New client");
          handleOpenChange(false);
        } else {
          router.refresh();
          setShowSuccess(true);
        }
      } else {
        setError(result.error);
      }
    });
  }

  // ── Derived validation gates ─────────────────────────────────────────────

  const step1Valid =
    state.name.trim().length >= 2 &&
    isValidEmail(state.email) &&
    state.portfolioName.trim().length >= 2;

  // Total properties the client will receive — drives the Step 3 summary.
  const totalProperties =
    state.propertyStubs.filter((row) => row.name.trim() !== "").length +
    state.assignPropertyIds.length;

  return (
    <ProModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Onboard a client"
      description="Create a portfolio, add properties, and invite your client."
    >
      {showSuccess ? (
        <ProModalSuccess
          message={`Invitation sent to ${state.name.trim() || "your client"}`}
          onComplete={() => handleOpenChange(false)}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <ProgressStepper step={state.step} />

          {state.step === 1 && (
            <StepOne
              state={state}
              onNameChange={handleNameChange}
              onEmailChange={(value) => patch({ email: value })}
              onPortfolioChange={handlePortfolioChange}
              onClientTypeChange={(value) => patch({ clientType: value })}
              onNext={() => goToStep(2)}
              onCancel={() => handleOpenChange(false)}
              nextDisabled={!step1Valid}
            />
          )}

          {state.step === 2 && (
            <StepTwo
              state={state}
              unassignedProperties={unassignedProperties}
              onAddRow={addPropertyRow}
              onUpdateRow={updatePropertyRow}
              onRemoveRow={removePropertyRow}
              onToggleAssigned={toggleAssignedProperty}
              onNext={() => goToStep(3)}
              onSkip={() => goToStep(3)}
              onCancel={() => handleOpenChange(false)}
            />
          )}

          {state.step === 3 && (
            <StepThree
              state={state}
              totalProperties={totalProperties}
              error={error}
              isPending={isPending}
              onRoleChange={(value) => patch({ role: value })}
              onLocaleChange={(value) => patch({ locale: value })}
              onRetainChange={(value) => patch({ retainAccess: value })}
              onSubmit={handleSubmit}
              onBack={() => goToStep(2)}
              onCancel={() => handleOpenChange(false)}
            />
          )}
        </div>
      )}
    </ProModal>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Progress stepper — three dots, non-interactive. Active is filled blue,
// completed shows a green check, future steps are a grey outline.
// ────────────────────────────────────────────────────────────────────────────

function ProgressStepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((dot) => {
          const completed = dot < step;
          const active = dot === step;
          return (
            <span
              key={dot}
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                completed &&
                  "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-500",
                active &&
                  "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500",
                !completed &&
                  !active &&
                  "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500",
              )}
            >
              {completed ? <Check className="h-3 w-3" strokeWidth={3} /> : dot}
            </span>
          );
        })}
      </div>
      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
        Step {step} of 3
      </span>
    </div>
  );
}

// A plain text "link" used for Cancel / Back / Skip actions.
function TextLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
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

// ────────────────────────────────────────────────────────────────────────────
// Step 1 — Client & Portfolio
// ────────────────────────────────────────────────────────────────────────────

function StepOne({
  state,
  onNameChange,
  onEmailChange,
  onPortfolioChange,
  onClientTypeChange,
  onNext,
  onCancel,
  nextDisabled,
}: {
  state: WizardState;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPortfolioChange: (value: string) => void;
  onClientTypeChange: (value: "Individual" | "Corporate") => void;
  onNext: () => void;
  onCancel: () => void;
  nextDisabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ProField label="Client name" htmlFor="wizard-name">
        <input
          id="wizard-name"
          type="text"
          required
          value={state.name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="e.g. Sokha Family Office"
          className={proInputClass}
        />
      </ProField>

      <ProField label="Client email" htmlFor="wizard-email">
        <input
          id="wizard-email"
          type="email"
          required
          value={state.email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="owner@example.com"
          className={proInputClass}
        />
      </ProField>

      <ProField
        label="Portfolio name"
        htmlFor="wizard-portfolio"
        hint="Defaults to the client name — edit if you'd like a different label."
      >
        <input
          id="wizard-portfolio"
          type="text"
          value={state.portfolioName}
          onChange={(event) => onPortfolioChange(event.target.value)}
          placeholder="e.g. Sokha Family Office"
          className={proInputClass}
        />
      </ProField>

      <ProField label="Client type">
        <div className="flex gap-2">
          {(["Individual", "Corporate"] as const).map((option) => {
            const selected = state.clientType === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => onClientTypeChange(option)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors",
                  selected
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </ProField>

      <div className="flex items-center justify-between pt-1">
        <TextLink onClick={onCancel}>Cancel</TextLink>
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

// ────────────────────────────────────────────────────────────────────────────
// Step 2 — Properties
// ────────────────────────────────────────────────────────────────────────────

function StepTwo({
  state,
  unassignedProperties,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onToggleAssigned,
  onNext,
  onSkip,
  onCancel,
}: {
  state: WizardState;
  unassignedProperties: Array<{ id: string; name: string }>;
  onAddRow: () => void;
  onUpdateRow: (index: number, next: Partial<PropertyStub>) => void;
  onRemoveRow: (index: number) => void;
  onToggleAssigned: (propertyId: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
          Portfolio properties
        </h3>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
          Add properties now or later — you can always add more after the client
          accepts.
        </p>
      </div>

      {/* Sketched property rows. */}
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
                onChange={(event) =>
                  onUpdateRow(index, { name: event.target.value })
                }
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
                onChange={(event) =>
                  onUpdateRow(index, { type: event.target.value })
                }
                className={proSelectClass}
              >
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
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
                  onChange={(event) =>
                    onUpdateRow(index, {
                      value:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
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

      {/* Assign existing unassigned properties — only shown if any exist. */}
      {unassignedProperties.length > 0 && (
        <ProField
          label="Assign existing properties"
          hint={`${state.assignPropertyIds.length} of ${unassignedProperties.length} selected · optional`}
        >
          <div className="flex flex-wrap gap-2">
            {unassignedProperties.map((property) => {
              const selected = state.assignPropertyIds.includes(property.id);
              return (
                <button
                  key={property.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggleAssigned(property.id)}
                  className={
                    selected
                      ? "rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-700 transition-colors dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "rounded-full border border-slate-200 px-3 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  }
                >
                  {property.name}
                </button>
              );
            })}
          </div>
        </ProField>
      )}

      <div className="flex items-center justify-between pt-1">
        <TextLink onClick={onCancel}>Cancel</TextLink>
        <div className="flex items-center gap-4">
          <TextLink onClick={onSkip}>Skip — I&apos;ll add properties later</TextLink>
          <button type="button" onClick={onNext} className={proPrimaryButtonClass}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3 — Review & Invite
// ────────────────────────────────────────────────────────────────────────────

function StepThree({
  state,
  totalProperties,
  error,
  isPending,
  onRoleChange,
  onLocaleChange,
  onRetainChange,
  onSubmit,
  onBack,
  onCancel,
}: {
  state: WizardState;
  totalProperties: number;
  error: string | null;
  isPending: boolean;
  onRoleChange: (value: "full" | "view") => void;
  onLocaleChange: (value: "en" | "km") => void;
  onRetainChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Summary card. */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <dl className="flex flex-col gap-2 text-[13px]">
          <SummaryRow label="Client" value={state.name.trim() || "—"} />
          <SummaryRow label="Email" value={state.email.trim() || "—"} />
          <SummaryRow
            label="Portfolio"
            value={state.portfolioName.trim() || state.name.trim() || "—"}
          />
          <SummaryRow
            label="Properties"
            value={`${totalProperties} ${totalProperties === 1 ? "property" : "properties"}`}
          />
          <SummaryRow
            label="Access"
            value={state.role === "full" ? "Full access" : "View only"}
          />
        </dl>
      </div>

      {/* Role selector. */}
      <ProField label="Client access level">
        <div className="flex flex-col gap-2">
          <RoleOption
            selected={state.role === "full"}
            onSelect={() => onRoleChange("full")}
            title="Full access"
            description="Client can manage properties, tenants, and finances"
          />
          <RoleOption
            selected={state.role === "view"}
            onSelect={() => onRoleChange("view")}
            title="View only"
            description="Client can view portfolio data only"
          />
        </div>
      </ProField>

      {/* Locale selector. */}
      <ProField label="Invitation language" htmlFor="wizard-locale">
        <select
          id="wizard-locale"
          value={state.locale}
          onChange={(event) =>
            onLocaleChange(event.target.value as "en" | "km")
          }
          className={proSelectClass}
        >
          <option value="en">English</option>
          <option value="km">Khmer</option>
        </select>
      </ProField>

      {/* Keep-my-access toggle. */}
      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <span className="flex flex-col">
          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
            Keep my access to this portfolio
          </span>
          <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
            Stay on as manager after the client accepts.
          </span>
        </span>
        <input
          type="checkbox"
          checked={state.retainAccess}
          onChange={(event) => onRetainChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200 dark:border-slate-600"
        />
      </label>

      <ProFormError message={error} />

      <div className="flex items-center justify-between pt-1">
        <TextLink onClick={onCancel}>Cancel</TextLink>
        <div className="flex items-center gap-4">
          <TextLink onClick={onBack}>Back</TextLink>
          <button
            type="submit"
            disabled={isPending}
            className={proPrimaryButtonClass}
          >
            {isPending ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </div>
    </form>
  );
}

// A single label/value row inside the Step 3 summary card.
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

// A selectable role card with a title and description.
function RoleOption({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/15"
          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
            : "border-slate-300 dark:border-slate-600",
        )}
      >
        {selected && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
          </motion.span>
        )}
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
          {title}
        </span>
        <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
          {description}
        </span>
      </span>
    </button>
  );
}

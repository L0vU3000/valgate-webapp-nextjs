"use client";

import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
// The unlock modal (react-hook-form + zod, ~537 lines) loads lazily — its code stays out of
// this property segment's bundle until the user actually opens the unlock wizard.
const FeatureUnlockWizard = dynamic(
  () => import("../FeatureUnlockWizard").then((m) => m.FeatureUnlockWizard),
  { ssr: false },
);
import type { WizardConfig } from "../types";
import { HoldingTypeSchema, DistributionMethodSchema } from "@/lib/data/types/ownership-record";
import { CoOwnerRoleSchema } from "@/lib/data/types/co-owner";
import {
  createOwnershipRecord,
  updateOwnershipRecord,
  verifyOwnership,
  getOwnershipWizardInitialAction,
} from "@/app/actions/ownership-records";
import { updateProperty } from "@/app/actions/properties";
import {
  createCoOwner,
  updateCoOwner,
  removeCoOwner,
  listCoOwnersForPropertyAction,
} from "@/app/actions/co-owners";

// ── Schema ────────────────────────────────────────────────────────────────────

const OwnershipWizardSchema = z
  .object({
    // Step 1 — Structure
    holdingType: HoldingTypeSchema,
    distributionMethod: DistributionMethodSchema.optional(),

    // Step 2 — Loan
    loanType: z.string().optional(),
    lenderName: z.string().optional(),
    loanAmount: z.coerce.number().nonnegative().optional(),
    loanTermYears: z.coerce.number().int().positive().optional(),
    interestRate: z.coerce.number().nonnegative().optional(),
    originationDate: z.string().optional(),
    maturityDate: z.string().optional(),
    downPayment: z.coerce.number().nonnegative().optional(),
    closingCosts: z.coerce.number().nonnegative().optional(),

    // Step 3 — Co-owners
    coOwners: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1, "Name is required"),
          role: CoOwnerRoleSchema,
          sharePercent: z.coerce.number().min(0).max(100),
          email: z
            .union([z.string().email("Invalid email"), z.literal("")])
            .optional(),
          phone: z.string().optional(),
        }),
      )
      .default([]),

    // Set only by the Sole-Ownership confirm in the structure step. Absent or
    // false means Keep: existing co-owners survive the switch. Deletion needs
    // an explicit true — never a default.
    removeCoOwnersOnSoleSwitch: z.boolean().optional(),
  })
  .superRefine((vals, ctx) => {
    if (vals.holdingType !== "Sole Ownership") {
      if (vals.coOwners.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["coOwners"],
          message: "Add at least one co-owner",
        });
      }
      const total = vals.coOwners.reduce(
        (s, c) => s + (c.sharePercent ?? 0),
        0,
      );
      if (Math.abs(total - 100) > 0.01) {
        ctx.addIssue({
          code: "custom",
          path: ["coOwners"],
          message: `Shares must total 100% (currently ${total.toFixed(1)}%)`,
        });
      }
    }
  });

type OwnershipWizardValues = z.infer<typeof OwnershipWizardSchema>;

// The co-owners step is hidden when the property is solely owned; a hidden
// step expresses no intent about co-owners, so saves must not reconcile them.
const coOwnersStepIsSkipped = (values: OwnershipWizardValues) =>
  values.holdingType === "Sole Ownership";

// ── Step renders ──────────────────────────────────────────────────────────────

const HOLDING_TYPES = [
  "Tenancy in Common",
  "Joint Tenancy",
  "Sole Ownership",
  "Trust",
  "LLC",
  "Other",
] as const;

const DISTRIBUTION_METHODS = [
  "Pro-Rata by Share",
  "Equal Split",
  "Custom",
] as const;

function StructureStep({
  form,
  values,
}: {
  form: UseFormReturn<OwnershipWizardValues>;
  values: OwnershipWizardValues;
}) {
  return (
    <div className="space-y-6">
      {/* Holding type */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Holding Type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {HOLDING_TYPES.map((type) => {
            const selected = values.holdingType === type;
            return (
              <label
                key={type}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                  selected
                    ? "border-[var(--val-primary-dark)] bg-blue-50/50 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  value={type}
                  {...form.register("holdingType")}
                />
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selected
                      ? "border-[var(--val-primary-dark)]"
                      : "border-slate-300"
                  }`}
                >
                  {selected && (
                    <span className="w-2 h-2 bg-[var(--val-primary-dark)] rounded-full" />
                  )}
                </span>
                <span className="text-[13px] font-medium text-val-heading">
                  {type}
                </span>
              </label>
            );
          })}
        </div>
        {form.formState.errors.holdingType && (
          <p className="text-xs text-red-500 mt-1">
            {String(form.formState.errors.holdingType.message)}
          </p>
        )}
      </div>

      {/* Sole-Ownership confirm — the property still has saved co-owners.
          Deleting them needs explicit consent; Keep is the default. */}
      {values.holdingType === "Sole Ownership" &&
        (() => {
          const savedCoOwners = values.coOwners.filter((co) => co.id);
          if (savedCoOwners.length === 0) return null;
          const names = savedCoOwners.map((co) => co.name).join(", ");
          const removeChosen = values.removeCoOwnersOnSoleSwitch === true;
          return (
            <div className="p-4 border border-amber-200 bg-amber-50/50 rounded-lg space-y-3">
              <p className="text-sm text-val-heading">
                This removes {savedCoOwners.length} co-owner
                {savedCoOwners.length === 1 ? "" : "s"}: {names}.
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="soleOwnershipCoOwnerCleanup"
                    checked={!removeChosen}
                    onChange={() =>
                      form.setValue("removeCoOwnersOnSoleSwitch", false)
                    }
                  />
                  <span className="text-[13px] font-medium text-val-heading">
                    Keep them
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="soleOwnershipCoOwnerCleanup"
                    checked={removeChosen}
                    onChange={() =>
                      form.setValue("removeCoOwnersOnSoleSwitch", true)
                    }
                  />
                  <span className="text-[13px] font-medium text-val-heading">
                    Remove them
                  </span>
                </label>
              </div>
            </div>
          );
        })()}

      {/* Distribution method (only when not sole) */}
      {values.holdingType && values.holdingType !== "Sole Ownership" && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Distribution Method
          </p>
          <div className="flex flex-col gap-2">
            {DISTRIBUTION_METHODS.map((method) => {
              const selected = values.distributionMethod === method;
              return (
                <label
                  key={method}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                    selected
                      ? "border-[var(--val-primary-dark)] bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={method}
                    {...form.register("distributionMethod")}
                  />
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected
                        ? "border-[var(--val-primary-dark)]"
                        : "border-slate-300"
                    }`}
                  >
                    {selected && (
                      <span className="w-2 h-2 bg-[var(--val-primary-dark)] rounded-full" />
                    )}
                  </span>
                  <span className="text-[13px] font-medium text-val-heading">
                    {method}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LoanStep({
  form,
}: {
  form: UseFormReturn<OwnershipWizardValues>;
}) {
  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-val-heading placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors";
  const labelCls =
    "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";

  // Blank number inputs register as "" — coerce those to undefined so an empty
  // optional field reads as omitted, not as 0. Without this, "" coerces to 0 and
  // fails the schema's .positive() check, which silently blocks Continue. Mirrors
  // optionalNumber() in FinancialsUnlock.tsx.
  const numOpt = {
    setValueAs: (value: unknown) =>
      value === "" || value === null || value === undefined ? undefined : Number(value),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Loan Type</label>
          <input
            className={inputCls}
            placeholder="Fixed, ARM…"
            {...form.register("loanType")}
          />
        </div>
        <div>
          <label className={labelCls}>Lender Name</label>
          <input
            className={inputCls}
            placeholder="Bank name"
            {...form.register("lenderName")}
          />
        </div>
        <div>
          <label className={labelCls}>Loan Amount ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="0"
            {...form.register("loanAmount", numOpt)}
          />
        </div>
        <div>
          <label className={labelCls}>Loan Term (years)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="30"
            {...form.register("loanTermYears", numOpt)}
          />
        </div>
        <div>
          <label className={labelCls}>Interest Rate (%)</label>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            placeholder="6.5"
            {...form.register("interestRate", numOpt)}
          />
        </div>
        <div>
          <label className={labelCls}>Origination Date</label>
          <input
            type="date"
            className={inputCls}
            {...form.register("originationDate")}
          />
        </div>
        <div>
          <label className={labelCls}>Maturity Date</label>
          <input
            type="date"
            className={inputCls}
            {...form.register("maturityDate")}
          />
        </div>
        <div>
          <label className={labelCls}>Down Payment ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="0"
            {...form.register("downPayment", numOpt)}
          />
        </div>
        <div>
          <label className={labelCls}>Closing Costs ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="0"
            {...form.register("closingCosts", numOpt)}
          />
        </div>
      </div>
    </div>
  );
}

function CoOwnersStep({
  form,
  values,
}: {
  form: UseFormReturn<OwnershipWizardValues>;
  values: OwnershipWizardValues;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "coOwners",
  });

  const total = values.coOwners.reduce((s, c) => s + (Number(c.sharePercent) || 0), 0);
  const totalOk = Math.abs(total - 100) <= 0.01;

  const inputCls =
    "w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-val-heading placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors";

  return (
    <div className="space-y-4">
      {/* Share total indicator */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-semibold ${
          totalOk
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}
      >
        <span>Share total</span>
        <span>{total.toFixed(1)}% {totalOk ? "✓" : `— need ${(100 - total).toFixed(1)}% more`}</span>
      </div>

      {/* Co-owner rows */}
      <div className="space-y-3">
        {fields.map((field, i) => (
          <div
            key={field.id}
            className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">
                Owner {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input
                  className={inputCls}
                  placeholder="Full name *"
                  {...form.register(`coOwners.${i}.name`)}
                />
                {form.formState.errors.coOwners?.[i]?.name && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {form.formState.errors.coOwners[i]?.name?.message}
                  </p>
                )}
              </div>
              <div>
                <select
                  className={inputCls}
                  {...form.register(`coOwners.${i}.role`)}
                >
                  <option value="Primary">Primary</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>
              <div>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  className={inputCls}
                  placeholder="Share %"
                  {...form.register(`coOwners.${i}.sharePercent`)}
                />
              </div>
              <div>
                <input
                  className={inputCls}
                  placeholder="Email"
                  type="email"
                  {...form.register(`coOwners.${i}.email`)}
                />
              </div>
              <div>
                <input
                  className={inputCls}
                  placeholder="Phone"
                  {...form.register(`coOwners.${i}.phone`)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {fields.length < 10 && (
        <button
          type="button"
          onClick={() =>
            append({ name: "", role: "Primary", sharePercent: 0, email: "", phone: "" })
          }
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--val-primary-dark)] border-2 border-dashed border-[var(--val-primary-dark)]/30 rounded-xl hover:border-[var(--val-primary-dark)]/60 hover:bg-blue-50/30 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          Add co-owner
        </button>
      )}

      {/* Schema-level co-owners error */}
      {form.formState.errors.coOwners?.root?.message && (
        <p className="text-sm text-red-500">
          {form.formState.errors.coOwners.root.message}
        </p>
      )}
    </div>
  );
}

// ── Wizard config ─────────────────────────────────────────────────────────────

export const ownershipWizardConfig: WizardConfig<typeof OwnershipWizardSchema> =
  {
    pillarKey: "ownership",
    title: "Ownership Setup",
    schema: OwnershipWizardSchema,

    loadInitial: async ({ propertyId }) => {
      const result = await getOwnershipWizardInitialAction(propertyId);
      if (!result.ok) return { values: {}, entityId: null, verified: false };

      const { record, coOwners } = result.data;

      return {
        values: {
          holdingType: record?.holdingType,
          distributionMethod: record?.distributionMethod,
          loanType: record?.loanType,
          lenderName: record?.lenderName,
          loanAmount: record?.loanAmount,
          loanTermYears: record?.loanTermYears,
          interestRate: record?.interestRate,
          originationDate: record?.originationDate
            ? new Date(record.originationDate).toISOString().split("T")[0]
            : undefined,
          maturityDate: record?.maturityDate
            ? new Date(record.maturityDate).toISOString().split("T")[0]
            : undefined,
          downPayment: record?.downPayment,
          closingCosts: record?.closingCosts,
          coOwners: coOwners.map((co) => ({
            id: co.id,
            name: co.name,
            role: co.role,
            sharePercent: co.sharePercent,
            email: co.email ?? "",
            phone: co.phone ?? "",
          })),
        },
        entityId: record?.id ?? null,
        verified: record?.verified ?? false,
      };
    },

    onSubmitData: async ({ values, propertyId, entityId }) => {
      const recordPatch = {
        propertyId,
        holdingType: values.holdingType,
        distributionMethod: values.distributionMethod,
        loanType: values.loanType,
        lenderName: values.lenderName,
        loanAmount: values.loanAmount,
        loanTermYears: values.loanTermYears,
        interestRate: values.interestRate,
        originationDate: values.originationDate
          ? new Date(values.originationDate).getTime()
          : undefined,
        maturityDate: values.maturityDate
          ? new Date(values.maturityDate).getTime()
          : undefined,
        downPayment: values.downPayment,
        closingCosts: values.closingCosts,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      let resolvedEntityId = entityId;

      // 1. Create or update the ownership record
      if (resolvedEntityId) {
        const updated = await updateOwnershipRecord(resolvedEntityId, {
          ...recordPatch,
          updatedAt: Date.now(),
        });
        if (!updated.ok) return { ok: false, error: updated.error };
      } else {
        const created = await createOwnershipRecord(recordPatch);
        if (!created.ok) return { ok: false, error: created.error };
        resolvedEntityId = created.data.id;
      }

      // 2. Sync outstandingMortgage on the property when loan amount is provided
      if (values.loanAmount != null) {
        await updateProperty(propertyId, {
          outstandingMortgage: values.loanAmount,
        });
      }

      // 3. Diff and reconcile co-owners — only when the co-owners step was shown.
      // A skipped step means the user never saw the co-owner list, so this save
      // carries no intent about co-owners and must not create, update, or delete
      // any (that delete-all is exactly the data loss QA hit). The single
      // exception: the user switched to Sole Ownership and explicitly confirmed
      // "Remove them" in the structure step — only then delete the saved rows.
      if (coOwnersStepIsSkipped(values)) {
        if (values.removeCoOwnersOnSoleSwitch === true) {
          const currentResult = await listCoOwnersForPropertyAction(propertyId);
          const currentCoOwners = currentResult.ok ? currentResult.data : [];
          for (const existing of currentCoOwners) {
            await removeCoOwner(existing.id);
          }
        }
      } else {
        const currentResult = await listCoOwnersForPropertyAction(propertyId);
        const currentCoOwners = currentResult.ok ? currentResult.data : [];

        const formCoOwnerIds = new Set(
          values.coOwners.filter((c) => c.id).map((c) => c.id!),
        );

        for (const co of values.coOwners) {
          if (co.id) {
            // Update existing
            await updateCoOwner(co.id, {
              name: co.name,
              role: co.role,
              sharePercent: co.sharePercent,
              email: co.email || undefined,
              phone: co.phone || undefined,
            });
          } else {
            // Create new
            await createCoOwner({
              propertyId,
              name: co.name,
              role: co.role,
              sharePercent: co.sharePercent,
              email: co.email || undefined,
              phone: co.phone || undefined,
            });
          }
        }

        // Remove co-owners the user deleted from the form. An empty list can't
        // come from a valid non-sole edit (schema superRefine requires ≥1
        // co-owner), so an empty list means the step was never populated —
        // treat it as "no change".
        if (values.coOwners.length > 0) {
          for (const existing of currentCoOwners) {
            if (!formCoOwnerIds.has(existing.id)) {
              await removeCoOwner(existing.id);
            }
          }
        }
      }

      return { ok: true, data: { entityId: resolvedEntityId! } };
    },

    verification: {
      title: "Verify ownership",
      declaration:
        "I confirm I am the legal owner of this property and the uploaded documents are authentic.",
      documentLabel: "Title Deed",
      minFiles: 1,
      maxFiles: 5,
      onVerify: async ({ entityId, docIds }) => {
        const result = await verifyOwnership(entityId, docIds);
        if (!result.ok) return { ok: false, error: result.error };
        return { ok: true, data: undefined };
      },
    },

    steps: [
      {
        key: "structure",
        title: "Ownership structure",
        description: "How is this property legally held?",
        fields: ["holdingType", "distributionMethod", "removeCoOwnersOnSoleSwitch"],
        render: ({ form, values }) => (
          <StructureStep form={form} values={values} />
        ),
      },
      {
        key: "loan",
        title: "Loan & financing",
        description: "All fields optional — add what you know.",
        fields: [
          "loanType",
          "lenderName",
          "loanAmount",
          "loanTermYears",
          "interestRate",
          "originationDate",
          "maturityDate",
          "downPayment",
          "closingCosts",
        ],
        render: ({ form }) => <LoanStep form={form} />,
      },
      {
        key: "co-owners",
        title: "Co-owners",
        description: "Add all parties with an ownership stake.",
        fields: ["coOwners"],
        shouldSkip: coOwnersStepIsSkipped,
        render: ({ form, values }) => (
          <CoOwnersStep form={form} values={values} />
        ),
      },
    ],
  };

// ── Mount component ───────────────────────────────────────────────────────────

interface OwnershipUnlockMountProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt?: "data" | "verification";
  onSuccess?: () => void;
}

export function OwnershipUnlockMount({
  propertyId,
  open,
  onOpenChange,
  startAt,
  onSuccess,
}: OwnershipUnlockMountProps) {
  return (
    <FeatureUnlockWizard
      config={ownershipWizardConfig}
      propertyId={propertyId}
      open={open}
      onOpenChange={onOpenChange}
      startAt={startAt}
      onSuccess={onSuccess}
    />
  );
}

"use client";

import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
// The unlock modal (react-hook-form + zod, ~537 lines) loads lazily — its code stays out of
// this property segment's bundle until the user actually opens the unlock wizard.
const FeatureUnlockWizard = dynamic(
  () => import("../FeatureUnlockWizard").then((m) => m.FeatureUnlockWizard),
  { ssr: false },
);
import type { PropertyOption } from "../FeatureUnlockWizard";
import type { WizardConfig } from "../types";
import type { UseFormReturn } from "react-hook-form";
import {
  verifyEstate,
  getEstateWizardInitialAction,
} from "@/app/actions/properties";
import {
  assignSuccessorToProperty,
  removeAssignment,
  listAssignmentsForPropertyAction,
} from "@/app/actions/estate-assignments";
import { createSuccessor, updateSuccessor } from "@/app/actions/successors";
import type { SuccessorRelation } from "@/lib/data/types/successor";

const beneficiaryRowSchema = z.object({
  assignmentId: z.string().optional(),
  successorId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  relation: z.enum(["Spouse", "Child", "Sibling", "Parent", "Other"]),
  role: z.enum(["primary", "contingent"]),
  share: z.coerce.number().min(0).max(100),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  phone: z.string().optional(),
});

const EstateWizardSchema = z
  .object({
    beneficiaries: z.array(beneficiaryRowSchema).min(1, "Add at least one beneficiary"),
  })
  .superRefine((vals, ctx) => {
    const primaries = vals.beneficiaries.filter((b) => b.role === "primary");
    const total = primaries.reduce((sum, b) => sum + (Number(b.share) || 0), 0);
    if (primaries.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["beneficiaries"],
        message: "At least one primary beneficiary is required",
      });
    } else if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: "custom",
        path: ["beneficiaries"],
        message: `Primary shares must total 100% (currently ${total.toFixed(1)}%)`,
      });
    }
  });

type EstateWizardValues = z.infer<typeof EstateWizardSchema>;
type BeneficiaryRow = EstateWizardValues["beneficiaries"][number];

let catalogSuccessors: Array<{ id: string; name: string; relation: string; role: string; share: number }> = [];

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";
const selectCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-val-heading focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors appearance-none";
const compactInputCls =
  "w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-val-heading placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors";

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hasContact(row: BeneficiaryRow): boolean {
  return Boolean(row.email?.trim() || row.phone?.trim());
}

function BeneficiariesStep({
  form,
  values,
}: {
  form: UseFormReturn<EstateWizardValues>;
  values: EstateWizardValues;
}) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "beneficiaries" });
  const primaries = values.beneficiaries.filter((b) => b.role === "primary");
  const primaryTotal = primaries.reduce((sum, b) => sum + (Number(b.share) || 0), 0);
  const primaryOk = primaries.length > 0 && Math.abs(primaryTotal - 100) <= 0.01;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">Primary beneficiary shares must total 100%.</p>
      <div
        className={`flex justify-between px-4 py-2.5 rounded-lg border text-sm font-semibold tabular-nums ${
          primaryOk ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
        }`}
      >
        <span>Primary total</span>
        <span>{primaryTotal.toFixed(1)}%</span>
      </div>
      {form.formState.errors.beneficiaries?.message && (
        <p className="text-[12px] text-red-600">{form.formState.errors.beneficiaries.message}</p>
      )}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/40 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Beneficiary {index + 1}
              </span>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(index)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {catalogSuccessors.length > 0 && (
              <div>
                <label className={labelCls}>Use existing</label>
                <select
                  className={selectCls}
                  value={form.watch(`beneficiaries.${index}.successorId`) ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      form.setValue(`beneficiaries.${index}.successorId`, undefined);
                      return;
                    }
                    const picked = catalogSuccessors.find((s) => s.id === id);
                    if (!picked) return;
                    form.setValue(`beneficiaries.${index}.successorId`, id);
                    form.setValue(`beneficiaries.${index}.name`, picked.name);
                    form.setValue(`beneficiaries.${index}.relation`, picked.relation as BeneficiaryRow["relation"]);
                    form.setValue(`beneficiaries.${index}.role`, picked.role as BeneficiaryRow["role"]);
                    form.setValue(`beneficiaries.${index}.share`, picked.share);
                  }}
                >
                  <option value="">New beneficiary</option>
                  {catalogSuccessors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.relation}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Full name</label>
                <input className={compactInputCls} {...form.register(`beneficiaries.${index}.name`)} />
              </div>
              <div>
                <label className={labelCls}>Relation</label>
                <select className={compactInputCls} {...form.register(`beneficiaries.${index}.relation`)}>
                  {(["Spouse", "Child", "Sibling", "Parent", "Other"] as const).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select className={compactInputCls} {...form.register(`beneficiaries.${index}.role`)}>
                  <option value="primary">Primary</option>
                  <option value="contingent">Contingent</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Share (%)</label>
                <input type="number" min={0} max={100} step="0.1" className={compactInputCls} {...form.register(`beneficiaries.${index}.share`)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => append({ name: "", relation: "Other", role: "primary", share: 0, email: "", phone: "" })}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--val-primary-dark)]"
      >
        <Plus className="w-4 h-4" /> Add beneficiary
      </button>
    </div>
  );
}

function ContactsStep({ form, values }: { form: UseFormReturn<EstateWizardValues>; values: EstateWizardValues }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">Each primary beneficiary needs an email or phone on file.</p>
      {values.beneficiaries.map((row, index) => (
        <div key={`contact-${index}`} className="p-4 border border-slate-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-val-heading">{row.name || `Beneficiary ${index + 1}`}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={compactInputCls} {...form.register(`beneficiaries.${index}.email`)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={compactInputCls} {...form.register(`beneficiaries.${index}.phone`)} />
            </div>
          </div>
          {row.role === "primary" && !hasContact(row) && (
            <p className="text-[11px] text-red-600">Email or phone required for primary beneficiaries</p>
          )}
        </div>
      ))}
    </div>
  );
}

async function syncBeneficiaries(propertyId: string, rows: BeneficiaryRow[]) {
  for (const row of rows) {
    if (row.role === "primary" && !hasContact(row)) {
      return { ok: false as const, error: "Each primary beneficiary needs an email or phone number." };
    }
  }

  const currentResult = await listAssignmentsForPropertyAction(propertyId);
  const currentAssignments = currentResult.ok ? currentResult.data : [];
  const keepAssignmentIds = new Set(rows.map((r) => r.assignmentId).filter(Boolean));

  for (const assignment of currentAssignments) {
    if (!keepAssignmentIds.has(assignment.id)) {
      const removed = await removeAssignment(assignment.id);
      if (!removed.ok) return removed;
    }
  }

  const now = Date.now();

  for (const row of rows) {
    const patch = {
      name: row.name.trim(),
      initials: buildInitials(row.name),
      relation: row.relation as SuccessorRelation,
      role: row.role,
      share: row.share,
      email: row.email?.trim() || undefined,
      phone: row.phone?.trim() || undefined,
      verified: hasContact(row),
      updatedAt: now,
    };

    let successorId = row.successorId;

    if (successorId) {
      const updated = await updateSuccessor(successorId, patch);
      if (!updated.ok) return updated;
    } else {
      const created = await createSuccessor({
        ...patch,
        createdAt: now,
      });
      if (!created.ok) return created;
      successorId = created.data.id;
    }

    const assigned = await assignSuccessorToProperty(successorId, propertyId);
    if (!assigned.ok) return assigned;
  }

  return { ok: true as const, data: { entityId: propertyId } };
}

export const estateWizardConfig: WizardConfig<typeof EstateWizardSchema> = {
  pillarKey: "estate",
  title: "Estate plan",
  schema: EstateWizardSchema,

  loadInitial: async ({ propertyId }) => {
    const result = await getEstateWizardInitialAction(propertyId);
    if (!result.ok) return { values: { beneficiaries: [] }, entityId: propertyId, verified: false };

    const { property, assignments, successors, allSuccessors } = result.data;
    catalogSuccessors = allSuccessors.map((s) => ({
      id: s.id,
      name: s.name,
      relation: s.relation,
      role: s.role,
      share: s.share,
    }));

    const beneficiaries: BeneficiaryRow[] =
      successors.length > 0
        ? successors.map((successor) => {
            const assignment = assignments.find((a) => a.successorId === successor.id);
            return {
              assignmentId: assignment?.id,
              successorId: successor.id,
              name: successor.name,
              relation: successor.relation,
              role: successor.role,
              share: successor.share,
              email: successor.email ?? "",
              phone: successor.phone ?? "",
            };
          })
        : [{ name: "", relation: "Other", role: "primary", share: 100, email: "", phone: "" }];

    return {
      values: { beneficiaries },
      entityId: propertyId,
      verified: property?.estateVerified ?? false,
    };
  },

  onSubmitData: async ({ values, propertyId }) => syncBeneficiaries(propertyId, values.beneficiaries),

  verification: {
    title: "Verify estate plan",
    declaration:
      "I confirm this will or trust names the beneficiaries above for this property.",
    documentLabel: "Will or trust deed",
    minFiles: 1,
    maxFiles: 3,
    onVerify: async ({ entityId, docIds }) => {
      const result = await verifyEstate(entityId, docIds);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, data: undefined };
    },
  },

  steps: [
    {
      key: "beneficiaries",
      title: "Beneficiaries",
      description: "Who inherits this property?",
      fields: ["beneficiaries"],
      render: ({ form, values }) => (
        <BeneficiariesStep form={form as UseFormReturn<EstateWizardValues>} values={values as EstateWizardValues} />
      ),
    },
    {
      key: "contacts",
      title: "Contact details",
      description: "How can we reach each beneficiary?",
      fields: ["beneficiaries"],
      render: ({ form, values }) => (
        <ContactsStep form={form as UseFormReturn<EstateWizardValues>} values={values as EstateWizardValues} />
      ),
    },
  ],
};

interface EstateUnlockMountProps {
  propertyId: string;
  properties?: PropertyOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt?: "data" | "verification";
  onSuccess?: () => void;
}

export function EstateUnlockMount({
  propertyId,
  properties,
  open,
  onOpenChange,
  startAt,
  onSuccess,
}: EstateUnlockMountProps) {
  return (
    <FeatureUnlockWizard
      config={estateWizardConfig}
      propertyId={propertyId}
      properties={properties}
      open={open}
      onOpenChange={onOpenChange}
      startAt={startAt}
      onSuccess={onSuccess}
    />
  );
}

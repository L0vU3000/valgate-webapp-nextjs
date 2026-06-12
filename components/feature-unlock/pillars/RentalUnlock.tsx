"use client";

import { z } from "zod";
import { FeatureUnlockWizard } from "../FeatureUnlockWizard";
import type { WizardConfig } from "../types";
import type { UseFormReturn } from "react-hook-form";
import {
  verifyRental,
  getRentalWizardInitialAction,
} from "@/lib/actions/properties.actions";
import { createLease, updateLease } from "@/lib/actions/leases.actions";
import { createTenant, updateTenant } from "@/lib/actions/tenants.actions";
import { createPayment } from "@/lib/actions/payments.actions";

// ── Schema ────────────────────────────────────────────────────────────────────

const RentalWizardSchema = z
  .object({
    // Step 1 — Active lease
    unit: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    monthlyRent: z.coerce.number().nonnegative(),
    termMonths: z.coerce.number().int().positive(),
    renewalStatus: z.string().optional(),

    // Step 2 — Primary tenant
    tenantName: z.string().min(1, "Tenant name is required"),
    tenantEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    tenantPhone: z.string().optional(),

    // Step 3 — Recent payment (optional, but enforced as a group)
    paymentDate: z.string().optional(),
    paymentAmount: z.coerce.number().nonnegative().optional(),
    paymentKind: z.enum(["Rent", "Fee", "Deposit", "Refund"]).optional(),
    paymentMethod: z.enum(["ABA Bank", "Wing", "Wire transfer", "Cash"]).optional(),
    paymentStatus: z.enum(["Paid", "Pending", "Failed", "Overdue"]).optional(),
  })
  .superRefine((vals, ctx) => {
    const anyPayment = !!(
      vals.paymentDate ||
      vals.paymentAmount ||
      vals.paymentMethod ||
      vals.paymentStatus
    );
    if (anyPayment) {
      if (!vals.paymentDate)
        ctx.addIssue({ code: "custom", path: ["paymentDate"], message: "Required when adding a payment" });
      if (!vals.paymentAmount)
        ctx.addIssue({ code: "custom", path: ["paymentAmount"], message: "Required when adding a payment" });
      if (!vals.paymentMethod)
        ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "Required when adding a payment" });
      if (!vals.paymentStatus)
        ctx.addIssue({ code: "custom", path: ["paymentStatus"], message: "Required when adding a payment" });
      if (!vals.paymentKind)
        ctx.addIssue({ code: "custom", path: ["paymentKind"], message: "Required when adding a payment" });
    }
  });

type RentalWizardValues = z.infer<typeof RentalWizardSchema>;

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-val-heading placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";
const selectCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-val-heading focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors appearance-none";

// ── Step 1 — Active lease ─────────────────────────────────────────────────────

function ActiveLeaseStep({ form }: { form: UseFormReturn<RentalWizardValues> }) {
  const errors = form.formState.errors;
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">The current signed lease for this property.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Start Date</label>
          <input
            type="date"
            className={inputCls}
            {...form.register("startDate")}
          />
          {errors.startDate && (
            <p className="text-[11px] text-red-500 mt-1">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input
            type="date"
            className={inputCls}
            {...form.register("endDate")}
          />
          {errors.endDate && (
            <p className="text-[11px] text-red-500 mt-1">{errors.endDate.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Monthly Rent ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="850"
            min="0"
            {...form.register("monthlyRent")}
          />
          {errors.monthlyRent && (
            <p className="text-[11px] text-red-500 mt-1">{errors.monthlyRent.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Term (months)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="12"
            min="1"
            {...form.register("termMonths")}
          />
          {errors.termMonths && (
            <p className="text-[11px] text-red-500 mt-1">{errors.termMonths.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Unit (optional)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Unit 1A"
            {...form.register("unit")}
          />
        </div>
        <div>
          <label className={labelCls}>Renewal Status (optional)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Auto-renew"
            {...form.register("renewalStatus")}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Primary tenant ───────────────────────────────────────────────────

function PrimaryTenantStep({
  form,
  values,
}: {
  form: UseFormReturn<RentalWizardValues>;
  values: RentalWizardValues;
}) {
  const errors = form.formState.errors;
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">Who lives in the property?</p>

      {values.unit && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Unit</span>
          <span className="text-[13px] font-medium text-val-heading">{values.unit}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Full Name</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Sokha Dara"
            {...form.register("tenantName")}
          />
          {errors.tenantName && (
            <p className="text-[11px] text-red-500 mt-1">{errors.tenantName.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Email (optional)</label>
          <input
            type="email"
            className={inputCls}
            placeholder="tenant@example.com"
            {...form.register("tenantEmail")}
          />
          {errors.tenantEmail && (
            <p className="text-[11px] text-red-500 mt-1">{errors.tenantEmail.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Phone (optional)</label>
          <input
            type="tel"
            className={inputCls}
            placeholder="+855 12 345 678"
            {...form.register("tenantPhone")}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — Recent payment ───────────────────────────────────────────────────

const PAYMENT_KINDS = ["Rent", "Fee", "Deposit", "Refund"] as const;
const PAYMENT_METHODS = ["ABA Bank", "Wing", "Wire transfer", "Cash"] as const;
const PAYMENT_STATUSES = ["Paid", "Pending", "Failed", "Overdue"] as const;

function RecentPaymentStep({ form }: { form: UseFormReturn<RentalWizardValues> }) {
  const errors = form.formState.errors;
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">
        Optionally record a recent rent payment. Skip if you&apos;d rather add payments later.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Payment Date</label>
          <input
            type="date"
            className={inputCls}
            {...form.register("paymentDate")}
          />
          {errors.paymentDate && (
            <p className="text-[11px] text-red-500 mt-1">{errors.paymentDate.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Amount ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="850"
            min="0"
            {...form.register("paymentAmount")}
          />
          {errors.paymentAmount && (
            <p className="text-[11px] text-red-500 mt-1">{errors.paymentAmount.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select className={selectCls} {...form.register("paymentKind")}>
            <option value="">Select type…</option>
            {PAYMENT_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {errors.paymentKind && (
            <p className="text-[11px] text-red-500 mt-1">{errors.paymentKind.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Method</label>
          <select className={selectCls} {...form.register("paymentMethod")}>
            <option value="">Select method…</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {errors.paymentMethod && (
            <p className="text-[11px] text-red-500 mt-1">{errors.paymentMethod.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Status</label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_STATUSES.map((s) => {
              const colorMap: Record<string, string> = {
                Paid: "border-emerald-400 bg-emerald-50 text-emerald-700",
                Pending: "border-amber-400 bg-amber-50 text-amber-700",
                Failed: "border-rose-400 bg-rose-50 text-rose-700",
                Overdue: "border-rose-500 bg-rose-50 text-rose-800",
              };
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => form.setValue("paymentStatus", s)}
                  className={`px-3 py-2 rounded-lg border text-[12px] font-semibold transition-colors ${
                    form.watch("paymentStatus") === s
                      ? colorMap[s]
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {errors.paymentStatus && (
            <p className="text-[11px] text-red-500 mt-1">{errors.paymentStatus.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wizard config ─────────────────────────────────────────────────────────────

export const rentalWizardConfig: WizardConfig<typeof RentalWizardSchema> = {
  pillarKey: "rental",
  title: "Rental Setup",
  schema: RentalWizardSchema,

  loadInitial: async ({ propertyId }) => {
    const result = await getRentalWizardInitialAction(propertyId);
    if (!result.ok) return { values: {}, entityId: null, verified: false };

    const { property, activeLease, primaryTenant } = result.data;
    if (!property) return { values: {}, entityId: null, verified: false };

    const fmtDate = (ms?: number) =>
      ms ? new Date(ms).toISOString().slice(0, 10) : undefined;

    return {
      entityId: property.id,
      verified: property.rentalVerified === true,
      values: {
        unit: activeLease?.unit ?? primaryTenant?.unit ?? "",
        startDate: fmtDate(activeLease?.startDate) ?? "",
        endDate: fmtDate(activeLease?.endDate) ?? "",
        monthlyRent: activeLease?.monthlyRent,
        termMonths: activeLease?.termMonths,
        renewalStatus: activeLease?.renewalStatus ?? "",
        tenantName: primaryTenant?.name ?? "",
        tenantEmail: primaryTenant?.email ?? "",
        tenantPhone: primaryTenant?.phone ?? "",
      },
    };
  },

  onSubmitData: async ({ values, propertyId }) => {
    const result = await getRentalWizardInitialAction(propertyId);
    if (!result.ok) return { ok: false, error: result.error };

    const { activeLease, primaryTenant } = result.data;

    // 1. Lease — update existing active or create new
    const leasePatch = {
      propertyId,
      unit: values.unit ?? "",
      stage: "Signed" as const,
      startDate: Date.parse(values.startDate),
      endDate: Date.parse(values.endDate),
      monthlyRent: values.monthlyRent ?? 0,
      termMonths: values.termMonths ?? 12,
      renewalStatus: values.renewalStatus || undefined,
      tenantId: primaryTenant?.id,
    };

    let leaseId: string;
    if (activeLease) {
      const leaseResult = await updateLease(activeLease.id, leasePatch);
      if (!leaseResult.ok) return leaseResult;
      leaseId = activeLease.id;
    } else {
      const leaseResult = await createLease(leasePatch);
      if (!leaseResult.ok) return leaseResult;
      leaseId = leaseResult.data.id;
    }

    // 2. Tenant — update existing primary or create new
    const tenantPatch = {
      propertyId,
      name: values.tenantName,
      unit: values.unit ?? "",
      rent: values.monthlyRent ?? 0,
      status: "Paid" as const,
      email: values.tenantEmail || undefined,
      phone: values.tenantPhone || undefined,
    };

    if (primaryTenant) {
      const tenantResult = await updateTenant(primaryTenant.id, tenantPatch);
      if (!tenantResult.ok) return tenantResult;
    } else {
      const tenantResult = await createTenant(tenantPatch);
      if (!tenantResult.ok) return tenantResult;
    }

    // 3. Payment — create only if all fields provided
    if (
      values.paymentDate &&
      values.paymentAmount &&
      values.paymentMethod &&
      values.paymentStatus &&
      values.paymentKind
    ) {
      await createPayment({
        leaseId,
        date: Date.parse(values.paymentDate),
        kind: values.paymentKind,
        amount: values.paymentAmount,
        method: values.paymentMethod,
        status: values.paymentStatus,
      });
    }

    return { ok: true, data: { entityId: propertyId } };
  },

  verification: {
    title: "Verify rental",
    declaration:
      "I confirm these rental details are accurate and the uploaded document is authentic.",
    documentLabel: "Signed lease",
    minFiles: 1,
    maxFiles: 5,
    onVerify: async ({ entityId, docIds }) => {
      const result = await verifyRental(entityId, docIds);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, data: undefined };
    },
  },

  steps: [
    {
      key: "active-lease",
      title: "Active lease",
      description: "The current signed lease for this property.",
      fields: ["startDate", "endDate", "monthlyRent", "termMonths", "unit", "renewalStatus"],
      render: ({ form }) => (
        <ActiveLeaseStep form={form as UseFormReturn<RentalWizardValues>} />
      ),
    },
    {
      key: "primary-tenant",
      title: "Primary tenant",
      description: "Who lives in the property?",
      fields: ["tenantName", "tenantEmail", "tenantPhone"],
      render: ({ form, values }) => (
        <PrimaryTenantStep
          form={form as UseFormReturn<RentalWizardValues>}
          values={values as RentalWizardValues}
        />
      ),
    },
    {
      key: "recent-payment",
      title: "Recent payment",
      description: "Optionally record a recent rent payment.",
      fields: ["paymentDate", "paymentAmount", "paymentKind", "paymentMethod", "paymentStatus"],
      render: ({ form }) => (
        <RecentPaymentStep form={form as UseFormReturn<RentalWizardValues>} />
      ),
    },
  ],
};

// ── Mount component ───────────────────────────────────────────────────────────

interface RentalUnlockMountProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt?: "data" | "verification";
  onSuccess?: () => void;
}

export function RentalUnlockMount({
  propertyId,
  open,
  onOpenChange,
  startAt,
  onSuccess,
}: RentalUnlockMountProps) {
  return (
    <FeatureUnlockWizard
      config={rentalWizardConfig}
      propertyId={propertyId}
      open={open}
      onOpenChange={onOpenChange}
      startAt={startAt}
      onSuccess={onSuccess}
    />
  );
}

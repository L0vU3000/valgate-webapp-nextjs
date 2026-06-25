"use client";

import { z } from "zod";
import { FeatureUnlockWizard } from "../FeatureUnlockWizard";
import type { WizardConfig } from "../types";
import type { UseFormReturn } from "react-hook-form";
import {
  updateProperty,
  verifyFinancials,
  getFinancialsWizardInitialAction,
} from "@/app/actions/properties";
import { createPropertyValuation } from "@/app/actions/property-valuations";

// ── Schema ────────────────────────────────────────────────────────────────────

const FinancialsWizardSchema = z.object({
  // Step 1 — Acquisition
  purchasePrice: z.coerce.number().nonnegative().optional(),
  purchaseDate: z.string().optional(),
  downPayment: z.coerce.number().nonnegative().optional(),
  closingCosts: z.coerce.number().nonnegative().optional(),

  // Step 2 — Current value
  currentMarketValue: z.coerce.number().nonnegative().optional(),
  logAsValuation: z.boolean().default(false),

  // Step 3 — Mortgage & debt
  outstandingMortgage: z.coerce.number().nonnegative().optional(),
  monthlyPayment: z.coerce.number().nonnegative().optional(),
  interestRate: z.coerce.number().nonnegative().optional(),

  // Step 4 — Annual costs
  annualPropertyTax: z.coerce.number().nonnegative().optional(),
  taxAssessmentValue: z.coerce.number().nonnegative().optional(),
  annualInsurance: z.coerce.number().nonnegative().optional(),
});

type FinancialsWizardValues = z.infer<typeof FinancialsWizardSchema>;

/** Blank number inputs register as "" — omit those instead of writing 0 to the DB. */
function optionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// ── Step renders ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-val-heading placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--val-primary-dark)]/30 focus:border-[var(--val-primary-dark)] transition-colors";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";

function AcquisitionStep({ form }: { form: UseFormReturn<FinancialsWizardValues> }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">What you paid and when.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Purchase Price ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="1,200,000"
            {...form.register("purchasePrice")}
          />
        </div>
        <div>
          <label className={labelCls}>Purchase Date</label>
          <input
            type="date"
            className={inputCls}
            {...form.register("purchaseDate")}
          />
        </div>
        <div>
          <label className={labelCls}>Down Payment ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="0"
            {...form.register("downPayment")}
          />
        </div>
        <div>
          <label className={labelCls}>Closing Costs ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="0"
            {...form.register("closingCosts")}
          />
        </div>
      </div>
    </div>
  );
}

function CurrentValueStep({
  form,
  values,
  latestValuationDate,
}: {
  form: UseFormReturn<FinancialsWizardValues>;
  values: FinancialsWizardValues;
  latestValuationDate?: string | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Current Market Value ($)</label>
        <input
          type="number"
          className={inputCls}
          placeholder="1,500,000"
          {...form.register("currentMarketValue")}
        />
        {latestValuationDate && (
          <p className="text-[12px] text-slate-400 mt-1.5">
            Latest valuation recorded: {latestValuationDate}
          </p>
        )}
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 accent-[var(--val-primary-dark)]"
          checked={values.logAsValuation}
          onChange={(e) => form.setValue("logAsValuation", e.target.checked)}
        />
        <span className="text-[13px] text-val-heading leading-snug">
          Also record this as a new valuation entry for the current month
        </span>
      </label>
    </div>
  );
}

function MortgageStep({ form }: { form: UseFormReturn<FinancialsWizardValues> }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">Loan principal still owed and current payment.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Outstanding Mortgage ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="750,000"
            {...form.register("outstandingMortgage")}
          />
        </div>
        <div>
          <label className={labelCls}>Monthly Payment ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="4,200"
            {...form.register("monthlyPayment")}
          />
        </div>
        <div>
          <label className={labelCls}>Interest Rate (%)</label>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            placeholder="6.5"
            {...form.register("interestRate")}
          />
        </div>
      </div>
    </div>
  );
}

function AnnualCostsStep({ form }: { form: UseFormReturn<FinancialsWizardValues> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Annual Property Tax ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="12,000"
            {...form.register("annualPropertyTax")}
          />
        </div>
        <div>
          <label className={labelCls}>Tax Assessment Value ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="1,100,000"
            {...form.register("taxAssessmentValue")}
          />
        </div>
        <div>
          <label className={labelCls}>Annual Insurance ($)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="4,800"
            {...form.register("annualInsurance")}
          />
        </div>
      </div>
    </div>
  );
}

// ── Wizard config ─────────────────────────────────────────────────────────────

export const financialsWizardConfig: WizardConfig<typeof FinancialsWizardSchema> =
  {
    pillarKey: "financials",
    title: "Financials Setup",
    schema: FinancialsWizardSchema,

    loadInitial: async ({ propertyId }) => {
      const result = await getFinancialsWizardInitialAction(propertyId);
      if (!result.ok) return { values: {}, entityId: null, verified: false };

      const { property, latestValuation } = result.data;
      if (!property) return { values: {}, entityId: null, verified: false };

      const purchaseDateStr = property.purchaseDate
        ? new Date(property.purchaseDate).toISOString().slice(0, 10)
        : undefined;

      const stale =
        !latestValuation ||
        Date.now() - latestValuation.recordedAt > 30 * 24 * 60 * 60 * 1000;

      return {
        entityId: property.id,
        verified: property.financialsVerified === true,
        values: {
          purchasePrice: property.buyNumeric || undefined,
          purchaseDate: purchaseDateStr,
          currentMarketValue: property.currentMarketValue,
          logAsValuation: stale,
          outstandingMortgage: property.outstandingMortgage,
          monthlyPayment: property.monthlyPayment,
          interestRate: property.interestRate,
          annualPropertyTax: property.annualPropertyTax,
          taxAssessmentValue: property.taxAssessmentValue,
          annualInsurance: property.annualInsurance,
        },
      };
    },

    onSubmitData: async ({ values, propertyId }) => {
      const purchasePrice = optionalNumber(values.purchasePrice);
      const patch = {
        buyNumeric: purchasePrice ?? 0,
        purchasePrice: purchasePrice != null ? String(purchasePrice) : undefined,
        purchaseDate: values.purchaseDate
          ? new Date(values.purchaseDate).getTime()
          : undefined,
        currentMarketValue: optionalNumber(values.currentMarketValue),
        outstandingMortgage: optionalNumber(values.outstandingMortgage),
        monthlyPayment: optionalNumber(values.monthlyPayment),
        interestRate: optionalNumber(values.interestRate),
        annualPropertyTax: optionalNumber(values.annualPropertyTax),
        taxAssessmentValue: optionalNumber(values.taxAssessmentValue),
        annualInsurance: optionalNumber(values.annualInsurance),
      };

      const propRes = await updateProperty(propertyId, patch);
      if (!propRes.ok) return propRes;

      if (values.logAsValuation && values.currentMarketValue) {
        const now = new Date();
        const month = `${now.toLocaleString("en-US", { month: "short" })} ${now.getFullYear()}`;
        await createPropertyValuation({
          propertyId,
          month,
          price: values.currentMarketValue,
          recordedAt: Date.now(),
        });
      }

      return { ok: true, data: { entityId: propertyId } };
    },

    verification: {
      title: "Verify financials",
      declaration:
        "I confirm these financial figures are accurate to the best of my knowledge and the uploaded documents are authentic.",
      documentLabel: "Mortgage statement",
      minFiles: 1,
      maxFiles: 5,
      onVerify: async ({ entityId, docIds }) => {
        const result = await verifyFinancials(entityId, docIds);
        if (!result.ok) return { ok: false, error: result.error };
        return { ok: true, data: undefined };
      },
    },

    steps: [
      {
        key: "acquisition",
        title: "Acquisition",
        description: "What you paid and when.",
        fields: ["purchasePrice", "purchaseDate", "downPayment", "closingCosts"],
        render: ({ form }) => (
          <AcquisitionStep form={form as UseFormReturn<FinancialsWizardValues>} />
        ),
      },
      {
        key: "current-value",
        title: "Current value",
        description: "Your best estimate of the property's market value today.",
        fields: ["currentMarketValue", "logAsValuation"],
        render: ({ form, values }) => (
          <CurrentValueStep
            form={form as UseFormReturn<FinancialsWizardValues>}
            values={values as FinancialsWizardValues}
          />
        ),
      },
      {
        key: "mortgage",
        title: "Mortgage & debt",
        description: "Loan principal still owed and current payment.",
        fields: ["outstandingMortgage", "monthlyPayment", "interestRate"],
        render: ({ form }) => (
          <MortgageStep form={form as UseFormReturn<FinancialsWizardValues>} />
        ),
      },
      {
        key: "annual-costs",
        title: "Annual costs",
        description: "Recurring annual expenses for this property.",
        fields: ["annualPropertyTax", "taxAssessmentValue", "annualInsurance"],
        render: ({ form }) => (
          <AnnualCostsStep form={form as UseFormReturn<FinancialsWizardValues>} />
        ),
      },
    ],
  };

// ── Mount component ───────────────────────────────────────────────────────────

interface FinancialsUnlockMountProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt?: "data" | "verification";
  onSuccess?: () => void;
}

export function FinancialsUnlockMount({
  propertyId,
  open,
  onOpenChange,
  startAt,
  onSuccess,
}: FinancialsUnlockMountProps) {
  return (
    <FeatureUnlockWizard
      config={financialsWizardConfig}
      propertyId={propertyId}
      open={open}
      onOpenChange={onOpenChange}
      startAt={startAt}
      onSuccess={onSuccess}
    />
  );
}

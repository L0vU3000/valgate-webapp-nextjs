"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, DollarSign, Info } from "lucide-react";
import type { FormData } from "./types";
import { FormField } from "./FormField";

export function Step3Financial({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const router = useRouter();
  const update = (key: keyof FormData, val: string) => setForm({ ...form, [key]: val });

  const ownershipOptions = [
    "Fully owned (No Mortgage)",
    "Financed (Mortgage/Loan)",
    "Leased",
    "Other",
  ];

  return (
    <div className="max-w-[1000px] mx-auto">
      <button
        onClick={() => router.push("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Financial Information
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Enter purchase details and ongoing expenses
      </p>

      <div className="flex gap-6">
        {/* Left: Form */}
        <div className="flex-1 border border-border rounded-xl p-6">
          <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
            Purchase Information
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Purchase Price" value={form.purchasePrice} onChange={(v) => update("purchasePrice", v)} />
              <FormField label="Purchase Date" value={form.purchaseDate} onChange={(v) => update("purchaseDate", v)} />
            </div>
            <FormField label="Current Market Value (Optional)" value={form.currentMarketValue} onChange={(v) => update("currentMarketValue", v)} />
          </div>

          <p className="text-[16px] text-foreground mt-6 mb-1" style={{ fontWeight: 600 }}>
            Ownership & Financing
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="mb-4">
            <p className="text-[14px] text-foreground mb-2" style={{ fontWeight: 500 }}>
              Ownership Status
            </p>
            <div className="space-y-2">
              {ownershipOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      form.ownershipStatus === opt ||
                      (opt === "Fully owned (No Mortgage)" && form.ownershipStatus === "Financed")
                        ? opt === "Fully owned (No Mortgage)" && form.ownershipStatus !== "Fully owned (No Mortgage)"
                          ? "border-border"
                          : "border-primary"
                        : "border-border"
                    }`}
                  >
                    {((opt === "Fully owned (No Mortgage)" && form.ownershipStatus === "Fully owned (No Mortgage)") ||
                      (opt === "Financed (Mortgage/Loan)" && form.ownershipStatus === "Financed") ||
                      form.ownershipStatus === opt) && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                  <span className="text-[14px] text-foreground">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Outstanding Mortgage" value={form.outstandingMortgage} onChange={(v) => update("outstandingMortgage", v)} />
              <FormField label="Monthly Payment" value={form.monthlyPayment} onChange={(v) => update("monthlyPayment", v)} />
            </div>
          </div>

          <p className="text-[16px] text-foreground mt-6 mb-1" style={{ fontWeight: 600 }}>
            Property Taxes & Insurance
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Annual Property Tax" value={form.annualPropertyTax} onChange={(v) => update("annualPropertyTax", v)} />
              <FormField label="Tax Assessment Value" value={form.taxAssessmentValue} onChange={(v) => update("taxAssessmentValue", v)} />
            </div>
            <FormField label="Annual Insurance Premium" value={form.annualInsurance} onChange={(v) => update("annualInsurance", v)} />
          </div>
        </div>

        {/* Right: Summary + Tips */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Financial Summary
              </p>
            </div>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Price</span>
                <span className="text-foreground">$250,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding mortgage</span>
                <span className="text-foreground">$180,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Equity</span>
                <span className="text-[#059669]" style={{ fontWeight: 600 }}>$70,000</span>
              </div>
            </div>
            <div className="border-t border-border mt-3 pt-3 space-y-2 text-[14px]">
              <p className="text-muted-foreground text-[12px]">Monthly Expenses</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mortgage</span>
                <span className="text-foreground">$250,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (monthly)</span>
                <span className="text-foreground">$180,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Insurance</span>
                <span className="text-[#059669]">$70,000</span>
              </div>
            </div>
            <div className="border-t border-border mt-3 pt-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground">Total</span>
                <span className="text-[#059669]" style={{ fontWeight: 600 }}>$70,000</span>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Financial Tips
              </p>
            </div>
            <ul className="space-y-1.5 text-[14px] text-muted-foreground list-disc pl-4">
              <li>Use a memorable property name</li>
              <li>Double-check address for accuracy</li>
              <li>Year built affects tax calculations</li>
              <li>Leave optional fields blank if not</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

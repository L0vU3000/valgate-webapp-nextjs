import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Expense } from "@/lib/data/types/expense";
import { formatCurrencyFull } from "@/lib/format";

export type PropertyFinancials = {
  acquisitionPrice: string;
  holdingPeriod: string;
  currentMarketValue: string;
  appreciationPct: string;
  outstandingMortgage: string;
  equityAmount: string;
  equityPct: number | null;
  ltv: string;
  monthlyPayment: string;
};

export function buildPropertyFinancials(property: Property): PropertyFinancials {
  const acquisitionBase = parseFloat(property.purchasePrice ?? "");
  const cmv = property.currentMarketValue;
  const mortgage = property.outstandingMortgage;

  return {
    acquisitionPrice:
      !isNaN(acquisitionBase) && acquisitionBase > 0
        ? formatCurrencyFull(acquisitionBase)
        : "—",
    holdingPeriod: deriveHoldingPeriod(property.purchaseDate),
    currentMarketValue: cmv != null ? formatCurrencyFull(cmv) : "—",
    appreciationPct: deriveAppreciation(acquisitionBase, cmv),
    outstandingMortgage: mortgage != null ? formatCurrencyFull(mortgage) : "—",
    equityAmount: deriveEquityAmount(cmv, mortgage),
    equityPct: deriveEquityPct(cmv, mortgage),
    ltv: deriveLtv(cmv, mortgage),
    monthlyPayment:
      property.monthlyPayment != null
        ? formatCurrencyFull(property.monthlyPayment)
        : "—",
  };
}

function deriveHoldingPeriod(purchaseDate?: number): string {
  if (purchaseDate == null) return "—";
  const purchase = new Date(purchaseDate);
  const today = new Date();
  let years = today.getFullYear() - purchase.getFullYear();
  let months = today.getMonth() - purchase.getMonth();
  if (today.getDate() < purchase.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return "< 1 mo";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo${months !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function deriveAppreciation(base: number, cmv?: number): string {
  if (isNaN(base) || base <= 0 || cmv == null) return "—";
  const pct = ((cmv - base) / base) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function deriveEquityAmount(cmv?: number, mortgage?: number): string {
  if (cmv == null || mortgage == null) return "—";
  return formatCurrencyFull(Math.round(cmv - mortgage));
}

function deriveEquityPct(cmv?: number, mortgage?: number): number | null {
  if (!cmv || mortgage == null) return null;
  return parseFloat((((cmv - mortgage) / cmv) * 100).toFixed(1));
}

function deriveLtv(cmv?: number, mortgage?: number): string {
  if (!cmv || mortgage == null) return "—";
  return `${((mortgage / cmv) * 100).toFixed(1)}%`;
}

export type InvestmentPerformance = {
  equityGained: string;
  totalRoiPct: string;
  capRate: string;
  cashOnCash: string;
};

export function computeInvestmentPerformance(
  property: Property,
  leases: Lease[],
  expenses: Expense[],
): InvestmentPerformance {
  const cmv = property.currentMarketValue;
  const mortgage = property.outstandingMortgage;
  const buyBase = property.buyNumeric;

  // Equity Gained: market value minus outstanding debt (or purchase price if no mortgage recorded)
  const equityGained =
    cmv != null
      ? formatCurrencyFull(Math.round(cmv - (mortgage ?? buyBase ?? 0)))
      : "—";

  // Total ROI: appreciation from purchase price to current market value
  const totalRoiPct =
    cmv != null && buyBase != null && buyBase > 0
      ? (() => {
          const pct = ((cmv - buyBase) / buyBase) * 100;
          const sign = pct >= 0 ? "+" : "";
          return `${sign}${pct.toFixed(1)}%`;
        })()
      : "—";

  // Only count active signed leases for this property
  const propertyLeases = leases.filter(
    (l) => l.propertyId === property.id && l.stage === "Signed",
  );
  const annualRent = propertyLeases.reduce((sum, l) => sum + l.monthlyRent, 0) * 12;

  // Annual expenses for this property
  const annualExpenses = expenses
    .filter((e) => e.propertyId === property.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const noi = annualRent - annualExpenses;

  // Cap Rate: NOI / market value (can be negative if expenses exceed rent)
  const capRate =
    propertyLeases.length > 0 && cmv != null && cmv > 0
      ? `${((noi / cmv) * 100).toFixed(1)}%`
      : "—";

  // Cash-on-Cash: annual pre-tax cash flow / purchase price
  const annualMortgagePayments = (property.monthlyPayment ?? 0) * 12;
  const annualCashFlow = noi - annualMortgagePayments;
  const cashOnCash =
    propertyLeases.length > 0 && buyBase != null && buyBase > 0
      ? `${((annualCashFlow / buyBase) * 100).toFixed(1)}%`
      : "—";

  return { equityGained, totalRoiPct, capRate, cashOnCash };
}

import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Expense } from "@/lib/data/types/expense";

export interface LeaseTableRow {
  propertyId: string;
  name: string;
  location: string;
  noi: string;
  rent: string;
  index: string;
  indexColor: string;
  avatarColor: string;
}

const AVATAR_GRADIENTS = [
  "bg-gradient-to-br from-blue-400 to-indigo-500",
  "bg-gradient-to-br from-emerald-400 to-teal-500",
  "bg-gradient-to-br from-violet-400 to-purple-500",
  "bg-gradient-to-br from-amber-400 to-orange-500",
  "bg-gradient-to-br from-rose-400 to-pink-500",
];

export function computeLeaseTableRows(
  properties: Property[],
  leases: Lease[],
  expenses: Expense[],
): LeaseTableRow[] {
  // 1. Per-property: compute avg monthly rent from active Signed leases
  const rentByProp = new Map<string, number>();
  for (const p of properties) {
    const activeLeases = leases.filter(
      (l) => l.propertyId === p.id && l.stage === "Signed",
    );
    const avg =
      activeLeases.length > 0
        ? activeLeases.reduce((s, l) => s + l.monthlyRent, 0) / activeLeases.length
        : 0;
    rentByProp.set(p.id, avg);
  }

  // 2. Portfolio-wide market average rent (all properties with active leases)
  const allAvgRents = [...rentByProp.values()].filter((r) => r > 0);
  const marketAvgRent =
    allAvgRents.length > 0
      ? allAvgRents.reduce((s, r) => s + r, 0) / allAvgRents.length
      : 0;

  // 3. Per-property annual expenses — expense seeds not yet populated so NOI ≈ annual rent
  const expenseByProp = new Map<string, number>();
  for (const e of expenses) {
    if (e.propertyId) {
      expenseByProp.set(e.propertyId, (expenseByProp.get(e.propertyId) ?? 0) + e.amount);
    }
  }

  // 4. Build rows for properties with at least one active lease, sorted by rent desc, top 5
  const rows: LeaseTableRow[] = properties
    .filter((p) => (rentByProp.get(p.id) ?? 0) > 0)
    .sort((a, b) => (rentByProp.get(b.id) ?? 0) - (rentByProp.get(a.id) ?? 0))
    .slice(0, 5)
    .map((p, i) => {
      const avgRent = rentByProp.get(p.id) ?? 0;
      const annualExpenses = expenseByProp.get(p.id) ?? 0;
      const noi = avgRent * 12 - annualExpenses;

      const city = (p as any).city ?? (p as any).province ?? "Unknown";
      const province = (p as any).province ?? "";
      const location = province && province !== city ? `${city}, ${province}` : city;

      let index: string;
      let indexColor: string;
      if (marketAvgRent === 0) {
        index = "Optimal";
        indexColor = "bg-emerald-50 text-emerald-700";
      } else {
        const pct = ((avgRent - marketAvgRent) / marketAvgRent) * 100;
        if (pct > 10) {
          index = `Market Leader (+${Math.round(pct)}%)`;
          indexColor = "bg-blue-50 text-blue-700";
        } else if (pct < -10) {
          index = `Below Market (${Math.round(Math.abs(pct))}%)`;
          indexColor = "bg-amber-50 text-amber-700";
        } else {
          index = "Optimal";
          indexColor = "bg-emerald-50 text-emerald-700";
        }
      }

      return {
        propertyId: p.id,
        name: p.name,
        location,
        noi:
          noi >= 0
            ? `$${Math.round(noi).toLocaleString("en-US")}`
            : `-$${Math.round(Math.abs(noi)).toLocaleString("en-US")}`,
        rent: `$${Math.round(avgRent).toLocaleString("en-US")} avg`,
        index,
        indexColor,
        avatarColor: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
      };
    });

  return rows;
}

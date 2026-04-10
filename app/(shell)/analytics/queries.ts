export type RevenueDataPoint = {
  month: string;
  revenue: number;
  expenses: number;
};

export type KpiIconKey = "DollarSign" | "TrendingUp" | "Building2" | "Percent" | "Wrench";

export type KpiCard = {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  iconKey: KpiIconKey;
};

export type LeasePipelineItem = {
  range: string;
  units: number;
  pct: number;
  color: string;
};

export type CapitalGrowthItem = {
  rank: string;
  name: string;
  growth: string;
  pct: number;
};

export type MaintenanceSpendItem = {
  month: string;
  value: number;
};

export type ExpenseBreakdownItem = {
  name: string;
  pct: number;
  color: string;
};

export type AnalyticsPageData = {
  revenueData: RevenueDataPoint[];
  kpiCards: KpiCard[];
  leasePipeline: LeasePipelineItem[];
  capitalGrowth: CapitalGrowthItem[];
  maintenanceSpend: MaintenanceSpendItem[];
  savedReports: string[];
  expenseBreakdown: ExpenseBreakdownItem[];
};

export async function getAnalyticsPageData(): Promise<AnalyticsPageData> {
  return {
    revenueData: [
      { month: "Jan", revenue: 95000, expenses: 38000 },
      { month: "Feb", revenue: 108000, expenses: 42000 },
      { month: "Mar", revenue: 118000, expenses: 45000 },
      { month: "Apr", revenue: 105000, expenses: 40000 },
      { month: "May", revenue: 130000, expenses: 48000 },
      { month: "Jun", revenue: 125000, expenses: 42000 },
      { month: "Jul", revenue: 138000, expenses: 50000 },
      { month: "Aug", revenue: 142000, expenses: 38000 },
      { month: "Sep", revenue: 128000, expenses: 47000 },
    ],
    kpiCards: [
      { label: "Total Revenue", value: "$1,248,300", change: "+8.4%", positive: true, iconKey: "DollarSign" },
      { label: "NOI", value: "$712,500", change: "+5.1%", positive: true, iconKey: "TrendingUp" },
      { label: "Occupancy", value: "91.4%", change: "-1.2%", positive: false, iconKey: "Building2" },
      { label: "Rent\nCollection", value: "97.8%", change: "+0.6%", positive: true, iconKey: "Percent" },
      { label: "Maintenance", value: "$48,200", change: "+12.3%", positive: false, iconKey: "Wrench" },
    ],
    leasePipeline: [
      { range: "0-3 Months", units: 12, pct: 25, color: "#fb7185" },
      { range: "4-6 Months", units: 34, pct: 60, color: "#fbbf24" },
      { range: "7-12 Months", units: 58, pct: 80, color: "#34d399" },
    ],
    capitalGrowth: [
      { rank: "01", name: "Skyline Tower", growth: "+14.2%", pct: 85 },
      { rank: "02", name: "Green Valley Apt", growth: "+11.8%", pct: 70 },
      { rank: "03", name: "Harbor Logistics", growth: "+9.5%", pct: 55 },
    ],
    maintenanceSpend: [
      { month: "MAR", value: 6200 },
      { month: "APR", value: 7800 },
      { month: "MAY", value: 5400 },
      { month: "JUN", value: 9100 },
      { month: "JUL", value: 7200 },
      { month: "AUG", value: 8400 },
    ],
    savedReports: [
      "Q2 Risk Assessment",
      "Maintenance ROI Analysis",
      "Tax Depreciation Est.",
    ],
    expenseBreakdown: [
      { name: "Maintenance", pct: 45, color: "#2563eb" },
      { name: "Utilities", pct: 25, color: "#fbbf24" },
      { name: "Taxes", pct: 30, color: "#10b981" },
    ],
  };
}

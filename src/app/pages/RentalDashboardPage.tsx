import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Wrench,
  FolderOpen,
  BarChart3,
  Search,
  Bell,
  Settings,
  AlertTriangle,
  TrendingUp,
  Plus,
  ChevronRight,
  Clock,
  ArrowUpDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "../components/ui/utils";

/* -------------------------------------------------------------------------- */
/*  Static Data                                                               */
/* -------------------------------------------------------------------------- */

const chartDataWeekly = [
  { day: "Mon", actual: 18200, projected: 22000 },
  { day: "Tue", actual: 24500, projected: 22000 },
  { day: "Wed", actual: 19800, projected: 22000 },
  { day: "Thu", actual: 28400, projected: 22000 },
  { day: "Fri", actual: 21000, projected: 22000 },
  { day: "Sat", actual: 16500, projected: 22000 },
  { day: "Sun", actual: 14000, projected: 22000, current: true },
];

const chartDataMonthly = [
  { day: "Wk 1", actual: 95000, projected: 110000 },
  { day: "Wk 2", actual: 108000, projected: 110000 },
  { day: "Wk 3", actual: 102000, projected: 110000 },
  { day: "Wk 4", actual: 87000, projected: 110000, current: true },
];

const asideLinks = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "leases", label: "Leases", icon: FileText },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

const urgentActions = [
  {
    color: "red" as const,
    title: "5 Overdue Eviction Notices",
    description: "Pending legal signature for West Oak Complex.",
    action: "Execute Now",
  },
  {
    color: "amber" as const,
    title: "Emergency Pipe Repair",
    description:
      "Unit 402B reported severe flooding. Contractor unassigned.",
    action: "Assign Vendor",
  },
  {
    color: "blue" as const,
    title: "8 Pending Lease Renewals",
    description: "Automatic notices scheduled for 10:00 AM.",
    action: "Review All",
  },
];

const properties = [
  {
    name: "The Zenith Towers",
    badge: "CRITICAL",
    badgeColor: "bg-red-600",
    units: 24,
    area: "Downtown",
    overdue: 4200,
    overdueColor: "text-status-danger",
    occupancy: 88,
    gradient: "from-slate-300 to-slate-500",
  },
  {
    name: "Maplewood Estates",
    badge: "HEALTHY",
    badgeColor: "bg-emerald-600",
    units: 12,
    area: "West End",
    overdue: 0,
    overdueColor: "text-secondary",
    occupancy: 100,
    gradient: "from-emerald-200 to-emerald-400",
  },
  {
    name: "Skyline Lofts",
    badge: "ATTENTION",
    badgeColor: "bg-amber-500",
    units: 42,
    area: "Central",
    overdue: 1150,
    overdueColor: "text-status-warning",
    occupancy: 92,
    gradient: "from-amber-200 to-amber-400",
  },
  {
    name: "Azure Palms Resort",
    badge: "MAINTENANCE",
    badgeColor: "bg-blue-600",
    units: 8,
    area: "Coastline",
    overdue: 0,
    overdueColor: "text-secondary",
    occupancy: 75,
    gradient: "from-blue-200 to-blue-400",
  },
];

const overdueTenants = [
  {
    initials: "JW",
    name: "James Wilson",
    unit: "Zenith Towers #301",
    days: 14,
    amount: "$2,450.00",
    lateFee: "$50",
  },
  {
    initials: "SC",
    name: "Sarah Chen",
    unit: "Skyline Lofts #1205",
    days: 8,
    amount: "$1,800.00",
    lateFee: "$25",
  },
  {
    initials: "MT",
    name: "Maria Torres",
    unit: "Azure Palms #102",
    days: 21,
    amount: "$3,200.00",
    lateFee: "$75",
  },
];

const maintenanceItems = [
  {
    initials: "AC",
    label: "A/C Unit Replacement",
    unit: "Zenith Towers #508",
    priority: "High",
    priorityColor: "text-status-danger-text bg-status-danger-bg",
    status: "Awaiting Parts",
  },
  {
    initials: "PL",
    label: "Plumbing Leak Fix",
    unit: "Maplewood Estates #3A",
    priority: "Medium",
    priorityColor: "text-status-warning-text bg-status-warning-bg",
    status: "Scheduled",
  },
  {
    initials: "EL",
    label: "Elevator Inspection",
    unit: "Skyline Lofts",
    priority: "Low",
    priorityColor: "text-status-info-text bg-status-info-bg",
    status: "In Progress",
  },
];

/* -------------------------------------------------------------------------- */
/*  Custom Bar Shape                                                          */
/* -------------------------------------------------------------------------- */

function RoundedBar(props: any) {
  const { x, y, width, height, fill } = props;
  const radius = 6;
  if (!height || height <= 0) return null;
  return (
    <path
      d={`M${x},${y + height} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + width - radius},${y} Q${x + width},${y} ${x + width},${y + radius} L${x + width},${y + height} Z`}
      fill={fill}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export function RentalDashboardPage() {
  const [activeNav, setActiveNav] = useState("overview");
  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly">(
    "weekly"
  );
  const [activeTab, setActiveTab] = useState("overview");

  const chartData =
    chartPeriod === "weekly" ? chartDataWeekly : chartDataMonthly;

  return (
    <div className="flex h-screen flex-col bg-surface-page">
      {/* ------------------------------------------------------------------ */}
      {/*  Unified Header                                                    */}
      {/* ------------------------------------------------------------------ */}
      <header className="shrink-0 border-b border-border-default bg-surface-base">
        {/* Row 1 — App bar: identity · search · user */}
        <div className="flex h-14 items-center gap-4 px-6">
          {/* Logo */}
          <span className="shrink-0 text-xl font-bold tracking-tight text-interactive-primary">
            Valgate
          </span>

          {/* Search */}
          <div className="relative mx-4 hidden max-w-sm flex-1 md:block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search portfolio, units, or tenants…"
              className="w-full rounded-full border border-border-default bg-surface-elevated py-1.5 pl-10 pr-4 text-sm text-foreground placeholder:text-secondary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User actions */}
          <div className="flex items-center gap-1">
            <button className="relative rounded-lg p-2 text-secondary hover:bg-surface-elevated">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-danger" />
            </button>
            <button className="rounded-lg p-2 text-secondary hover:bg-surface-elevated">
              <Settings className="h-5 w-5" />
            </button>
            <div className="ml-1 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
          </div>
        </div>

        {/* Hairline between rows */}
        <div className="h-px bg-border-subtle" />

        {/* Row 2 — Section bar: module nav · view switcher */}
        <div className="flex h-11 items-center justify-between px-6">
          {/* Left: section label + pill nav */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              Rental
            </span>
            <div className="h-4 w-px bg-border-default" />
            <nav className="flex items-center gap-0.5">
              {asideLinks.map(({ key, label, icon: Icon }) => {
                const badges: Record<string, number> = {
                  leases: 8,
                  payments: 5,
                  maintenance: 3,
                };
                const badge = badges[key];
                const isActive = activeNav === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveNav(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-interactive-primary text-white"
                        : "text-secondary hover:bg-surface-elevated hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                    {badge != null && (
                      <span
                        className={cn(
                          "flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                          isActive
                            ? "bg-white/25 text-inverse"
                            : "bg-surface-elevated text-secondary"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: view switcher */}
          <div className="hidden items-center gap-0.5 rounded-lg border border-border-default bg-surface-elevated p-0.5 md:flex">
            {(["Overview", "Map View", "Occupancy"] as const).map((tab) => {
              const key = tab.toLowerCase().replace(" ", "-");
              const isActive =
                activeTab === key ||
                (tab === "Overview" && activeTab === "overview");
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                    isActive
                      ? "bg-interactive-primary text-white shadow-sm"
                      : "text-secondary hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*  Body: Main                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Dashboard Canvas */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
            {/* -------------------------------------------------------------- */}
            {/*  A. Operational Overview                                        */}
            {/* -------------------------------------------------------------- */}
            <section>
              {/* Section header */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Operational Overview
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-status-danger-bg px-3 py-1 text-xs font-semibold text-status-danger-text">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    3 HIGH PRIORITY
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-status-warning-border bg-status-warning-bg px-3 py-1 text-xs font-semibold text-status-warning-text">
                    8 PENDING
                  </span>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Collection */}
                <div className="rounded-xl border border-border-default bg-surface-base p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    Total Collection
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    $142,500
                  </p>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-status-success">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +4.2% from last month
                  </p>
                </div>

                {/* Overdue Payments */}
                <div className="rounded-xl border border-border-default border-l-4 border-l-status-danger bg-surface-base p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    Overdue Payments
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-status-danger">
                    $12,840
                  </p>
                  <p className="mt-1.5 text-xs text-secondary">
                    Across 12 units (3 critical)
                  </p>
                </div>

                {/* Occupancy Rate */}
                <div className="rounded-xl border border-border-default bg-surface-base p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    Occupancy Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    94.8%
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-subtle">
                    <div
                      className="h-full rounded-full bg-interactive-primary transition-all"
                      style={{ width: "94.8%" }}
                    />
                  </div>
                </div>

                {/* Active Leases */}
                <div className="rounded-xl border border-border-default bg-surface-base p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                    Active Leases
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    158
                  </p>
                  <p className="mt-1.5 text-xs text-secondary">
                    8 Expiring in 30 days
                  </p>
                </div>
              </div>
            </section>

            {/* -------------------------------------------------------------- */}
            {/*  B. Main Bento Grid                                             */}
            {/* -------------------------------------------------------------- */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Collection Health Chart */}
              <div className="rounded-xl border border-border-default bg-surface-base p-6 lg:col-span-8">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                      Collection Health
                    </h2>
                    <p className="mt-0.5 text-xs text-secondary">
                      Daily receipt volume vs project revenue
                    </p>
                  </div>
                  <div className="flex rounded-lg border border-border-default bg-surface-elevated p-0.5">
                    {(["weekly", "monthly"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                          chartPeriod === p
                            ? "bg-interactive-primary text-white shadow-sm"
                            : "text-secondary hover:text-foreground"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border-default)"
                      />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
                        tickFormatter={(v: number) =>
                          `$${(v / 1000).toFixed(0)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `$${value.toLocaleString()}`,
                        ]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid var(--border-default)",
                          background: "var(--surface-elevated)",
                          color: "var(--foreground)",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="actual"
                        shape={<RoundedBar />}
                        radius={[6, 6, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              (entry as any).current
                                ? "var(--interactive-primary-hover)"
                                : "var(--interactive-primary)"
                            }
                            opacity={(entry as any).current ? 1 : 0.75}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-6">
                  <span className="flex items-center gap-2 text-xs text-secondary">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-interactive-primary" />
                    Actual Collected
                  </span>
                  <span className="flex items-center gap-2 text-xs text-secondary">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-border-strong" />
                    Projected Revenue
                  </span>
                </div>
              </div>

              {/* Urgent Actions */}
              <div className="rounded-xl border border-border-default bg-surface-base p-6 lg:col-span-4">
                <h2 className="mb-5 text-lg font-bold tracking-tight text-foreground">
                  Urgent Actions
                </h2>
                <div className="flex flex-col gap-3">
                  {urgentActions.map((item) => {
                    const colorMap = {
                      red: "border-status-danger-border bg-status-danger-bg",
                      amber: "border-status-warning-border bg-status-warning-bg",
                      blue: "border-status-info-border bg-status-info-bg",
                    };
                    const textMap = {
                      red: "text-status-danger-text",
                      amber: "text-status-warning-text",
                      blue: "text-status-info-text",
                    };
                    return (
                      <div
                        key={item.title}
                        className={cn(
                          "rounded-lg border p-4",
                          colorMap[item.color]
                        )}
                      >
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            textMap[item.color]
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          {item.description}
                        </p>
                        <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-text-link hover:text-text-link-hover">
                          {item.action}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* -------------------------------------------------------------- */}
            {/*  C. Priority Management Grid                                    */}
            {/* -------------------------------------------------------------- */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Priority Management Grid
                </h2>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-base px-3 py-1.5 text-xs font-medium text-secondary shadow-sm hover:bg-surface-elevated">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Sort by Status
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {properties.map((prop) => (
                  <div
                    key={prop.name}
                    className="group overflow-hidden rounded-xl border border-border-default bg-surface-base shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Image placeholder */}
                    <div
                      className={cn(
                        "relative h-28 bg-gradient-to-br",
                        prop.gradient
                      )}
                    >
                      <span
                        className={cn(
                          "absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white",
                          prop.badgeColor
                        )}
                      >
                        {prop.badge}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-foreground">
                        {prop.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-secondary">
                        {prop.units} Units &bull; {prop.area}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">
                            Overdue
                          </p>
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              prop.overdueColor
                            )}
                          >
                            {prop.overdue > 0
                              ? `$${prop.overdue.toLocaleString()}`
                              : "$0"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">
                            Occupancy
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {prop.occupancy}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* -------------------------------------------------------------- */}
            {/*  D. Bottom Row                                                  */}
            {/* -------------------------------------------------------------- */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Critical Overdue Payments */}
              <div className="rounded-xl border border-border-default bg-surface-base p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Critical Overdue Payments
                  </h2>
                  <button className="text-xs font-semibold text-text-link hover:text-text-link-hover">
                    View Ledger
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {overdueTenants.map((tenant) => (
                    <div
                      key={tenant.initials}
                      className="flex items-center gap-4"
                    >
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-interactive-primary">
                        {tenant.initials}
                      </div>
                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {tenant.name}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-secondary">
                          {tenant.unit}
                          <span className="inline-flex items-center gap-0.5 text-status-danger">
                            <Clock className="h-3 w-3" />
                            {tenant.days} Days Overdue
                          </span>
                        </p>
                      </div>
                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-status-danger">
                          {tenant.amount}
                        </p>
                        <p className="text-[10px] text-text-tertiary">
                          Incl. {tenant.lateFee} Late Fee
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Queue */}
              <div className="rounded-xl border border-border-default bg-surface-base p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Maintenance Queue
                  </h2>
                  <button className="text-xs font-semibold text-text-link hover:text-text-link-hover">
                    View All
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {maintenanceItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-4"
                    >
                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-bold text-secondary">
                        {item.initials}
                      </div>
                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {item.label}
                        </p>
                        <p className="text-xs text-secondary">{item.unit}</p>
                      </div>
                      {/* Status */}
                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            item.priorityColor
                          )}
                        >
                          {item.priority}
                        </span>
                        <p className="mt-0.5 text-[10px] text-text-tertiary">
                          {item.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  E. Floating Action Button                                          */}
      {/* ------------------------------------------------------------------ */}
      <button
        className="group fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-interactive-primary text-white shadow-2xl transition-all hover:w-[140px] hover:bg-interactive-primary-hover"
        aria-label="New entry"
      >
        <Plus className="h-6 w-6 shrink-0 transition-transform group-hover:rotate-90" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all group-hover:ml-2 group-hover:max-w-[80px] group-hover:opacity-100">
          NEW ENTRY
        </span>
      </button>
    </div>
  );
}

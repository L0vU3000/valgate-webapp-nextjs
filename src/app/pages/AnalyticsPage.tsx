import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const revenueData = [
  { month: "J", revenue: 95000, expenses: 38000 },
  { month: "F", revenue: 142000, expenses: 52000 },
  { month: "M", revenue: 118000, expenses: 45000 },
  { month: "A", revenue: 105000, expenses: 40000 },
  { month: "M", revenue: 130000, expenses: 48000 },
  { month: "J", revenue: 125000, expenses: 42000 },
  { month: "J", revenue: 138000, expenses: 50000 },
  { month: "A", revenue: 110000, expenses: 39000 },
  { month: "S", revenue: 142000, expenses: 55000 },
  { month: "O", revenue: 128000, expenses: 47000 },
  { month: "N", revenue: 135000, expenses: 44000 },
];

const occupancyData = [
  { name: "Maple Apartments", value: 95, target: 95, color: "#2563EB" },
  { name: "Riverside Complex", value: 90, target: 95, color: "#F59E0B" },
  { name: "Park View Lofts", value: 92, target: 95, color: "#2563EB" },
  { name: "Harbor Heights", value: 85, target: 95, color: "#E11D48" },
  { name: "Westside Studios", value: 94, target: 95, color: "#2563EB" },
];

const leaseExpirations = [
  { tenant: "J. Martinez", unit: "#204", expires: "Jan 15", status: "Renewing", statusColor: "#059669" },
  { tenant: "S. Chen", unit: "#312", expires: "Jan 22", status: "Pending", statusColor: "#F59E0B" },
  { tenant: "A. Patel", unit: "#107", expires: "Feb 1", status: "Vacating", statusColor: "#E11D48" },
  { tenant: "K. Wilson", unit: "#418", expires: "Feb 8", status: "Pending", statusColor: "#F59E0B" },
  { tenant: "L. Park", unit: "#506", expires: "Feb 14", status: "Renewing", statusColor: "#059669" },
];

const maintenanceData = [
  { category: "Plumbing", open: 7, avgDays: "3.4d", priority: "HIGH", prColor: "#E11D48" },
  { category: "HVAC", open: 4, avgDays: "5.1d", priority: "HIGH", prColor: "#E11D48" },
  { category: "Electrical", open: 2, avgDays: "2.8d", priority: "MED", prColor: "#059669" },
  { category: "Appliances", open: 5, avgDays: "6.2d", priority: "MED", prColor: "#059669" },
  { category: "General", open: 11, avgDays: "8.0d", priority: "LOW", prColor: "#F59E0B" },
];

const expenseBreakdown = [
  { name: "Maintenance", pct: 40, color: "#2563EB" },
  { name: "Management", pct: 22, color: "#F59E0B" },
  { name: "Utilities", pct: 14, color: "#059669" },
  { name: "Other", pct: 24, color: "#8591A0" },
];

const heatmapDays = ["M", "T", "W", "T", "F", "S", "S"];
const heatmapWeeks = Array.from({ length: 5 }, () =>
  Array.from({ length: 7 }, () => Math.floor(Math.random() * 4))
);

export function AnalyticsPage() {
  return (
    <div className="h-full flex flex-col font-['Inter',sans-serif]">
      {/* Top bar */}
      <div className="bg-card h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
        <h1 className="text-[20px] text-foreground" style={{ fontWeight: 600 }}>Analytics</h1>
        <div className="flex items-center gap-3">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-[12px]">All Properties</button>
          <button className="bg-card border border-border text-muted-foreground px-4 py-2 rounded-full text-[12px]">Last 12 months</button>
          <button className="bg-card border border-border text-foreground px-4 py-2 rounded-md text-[14px]">↓  Export</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <div className="max-w-[1160px] mx-auto space-y-8">
        {/* Portfolio Overview */}
        <section>
          <p className="text-[10px] text-[#6B7684] mb-2">PORTFOLIO OVERVIEW</p>
          <div className="grid grid-cols-4 gap-6">
            <StatCard label="Total Revenue (MTD)" value="$142,800" trend="▲ 8.2% vs last month" trendColor="#059669" />
            <StatCard label="Occupancy Rate" value="94.3%" trend="▲ 1.1% vs last month" trendColor="#059669" />
            <StatCard label="Avg Days to Lease" value="18 days" trend="▼ 3 days longer" trendColor="#881337" />
            <StatCard label="Outstanding Rent" value="$9,450" trend="▼ 3 units overdue" trendColor="#881337" />
          </div>
        </section>

        {/* Financial Performance */}
        <section>
          <p className="text-[10px] text-[#6B7684] mb-2">FINANCIAL PERFORMANCE</p>
          <div className="grid grid-cols-12 gap-6">
            {/* Revenue vs Expenses Chart */}
            <div className="col-span-8 bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-foreground text-[16px]" style={{ fontWeight: 600 }}>Revenue vs Expenses</p>
                  <p className="text-[12px] text-muted-foreground">Monthly · Last 12 months</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#515D66" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#515D66" }} tickFormatter={(v) => `$${v / 1000}K`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expense Breakdown */}
            <div className="col-span-4 bg-card border border-border rounded-xl p-4">
              <p className="text-foreground text-[16px] mb-1" style={{ fontWeight: 600 }}>Expense Breakdown</p>
              <p className="text-[12px] text-muted-foreground mb-4">By category this month</p>
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {expenseBreakdown.map((e) => (
                  <div key={e.name} style={{ width: `${e.pct}%`, backgroundColor: e.color }} />
                ))}
              </div>
              <div className="space-y-3">
                {expenseBreakdown.map((e) => (
                  <div key={e.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                      <span className="text-[14px] text-muted-foreground">{e.name}</span>
                    </div>
                    <span className="text-[14px] text-foreground">{e.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Net operating income</span>
                  <span className="text-foreground">$88,200</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">NOI margin</span>
                  <span className="text-foreground">61.8%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Occupancy & Leases */}
        <section>
          <p className="text-[10px] text-[#6B7684] mb-2">OCCUPANCY & LEASES</p>
          <div className="grid grid-cols-3 gap-6">
            {/* Occupancy by Property */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-foreground text-[16px] mb-1" style={{ fontWeight: 600 }}>Occupancy by Property</p>
              <p className="text-[12px] text-muted-foreground mb-4">Current vs 95% target</p>
              <div className="space-y-3">
                {occupancyData.map((o) => (
                  <div key={o.name} className="flex items-center gap-3">
                    <span className="text-[12px] text-foreground w-[140px] shrink-0 truncate">{o.name}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${o.value}%`, backgroundColor: o.color }} />
                    </div>
                    <span className="text-[12px] text-foreground w-6">{o.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Lease Expirations */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-foreground text-[16px] mb-1" style={{ fontWeight: 600 }}>Upcoming Lease Expirations</p>
              <p className="text-[12px] text-muted-foreground mb-4">Next 90 days</p>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-2">Tenant</th>
                    <th className="text-left pb-2">Unit</th>
                    <th className="text-left pb-2">Expires</th>
                    <th className="text-left pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaseExpirations.map((l) => (
                    <tr key={l.tenant} className="border-t border-border">
                      <td className="py-2 text-foreground">{l.tenant}</td>
                      <td className="py-2 text-muted-foreground">{l.unit}</td>
                      <td className="py-2 text-muted-foreground">{l.expires}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: l.statusColor }}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rent Collection */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-foreground text-[16px] mb-1" style={{ fontWeight: 600 }}>Rent Collection</p>
              <p className="text-[12px] text-muted-foreground mb-4">Current month status</p>
              <div className="flex items-center justify-center gap-8 mb-4">
                <div className="text-center">
                  <p className="text-[36px] text-[#2563EB]" style={{ fontWeight: 700 }}>87</p>
                  <p className="text-[12px] text-muted-foreground">Paid</p>
                </div>
                <div className="text-center">
                  <p className="text-[36px] text-[#E11D48]" style={{ fontWeight: 700 }}>3</p>
                  <p className="text-[12px] text-[#E11D48]">Overdue</p>
                </div>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On-time rate</span>
                  <span className="text-[#059669]">96.7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg days late</span>
                  <span className="text-foreground">4.2 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending collections</span>
                  <span className="text-[#E11D48]">$9,450</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Operations & Trends */}
        <section className="pb-8">
          <p className="text-[10px] text-[#6B7684] mb-2">OPERATIONS & TRENDS</p>
          <div className="grid grid-cols-2 gap-6">
            {/* Maintenance Volume */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-foreground text-[16px] mb-1" style={{ fontWeight: 600 }}>Maintenance Volume</p>
              <p className="text-[12px] text-muted-foreground mb-4">Open work orders by category</p>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-2">Category</th>
                    <th className="text-left pb-2">Open</th>
                    <th className="text-left pb-2">Avg days</th>
                    <th className="text-left pb-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceData.map((m) => (
                    <tr key={m.category} className="border-t border-border">
                      <td className="py-2 text-foreground">{m.category}</td>
                      <td className="py-2 text-foreground">{m.open}</td>
                      <td className="py-2 text-muted-foreground">{m.avgDays}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: m.prColor }}>
                          {m.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rent Payment Activity */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-foreground text-[16px] mb-1" style={{ fontWeight: 600 }}>Rent Payment Activity</p>
              <p className="text-[12px] text-muted-foreground mb-4">Daily payments received - last 5 weeks</p>
              <div className="space-y-1">
                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className="flex gap-1">
                    {week.map((val, di) => (
                      <div
                        key={di}
                        className="w-8 h-8 rounded"
                        style={{
                          backgroundColor:
                            val === 0 ? "#E8EAED" : val === 1 ? "#BFDBFE" : val === 2 ? "#60A5FA" : "#2563EB",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                {heatmapDays.map((d, i) => (
                  <span key={i} className="w-8 text-center text-[10px] text-muted-foreground">{d}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-muted-foreground">Less</span>
                {[0, 1, 2, 3].map((v) => (
                  <div
                    key={v}
                    className="w-4 h-4 rounded"
                    style={{
                      backgroundColor:
                        v === 0 ? "#E8EAED" : v === 1 ? "#BFDBFE" : v === 2 ? "#60A5FA" : "#2563EB",
                    }}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, trendColor }: {
  label: string; value: string; trend: string; trendColor: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[104px]">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>{value}</p>
      <p className="text-[12px]" style={{ color: trendColor }}>{trend}</p>
    </div>
  );
}
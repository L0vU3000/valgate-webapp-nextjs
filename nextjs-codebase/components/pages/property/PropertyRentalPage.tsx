"use client";

import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Mail, Phone, FileText, Upload, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Circle } from "lucide-react";

const chartData = [
  { month: "Jan", rent: 2100 },
  { month: "Feb", rent: 2300 },
  { month: "Mar", rent: 2450 },
  { month: "Apr", rent: 2200 },
  { month: "May", rent: 2400 },
  { month: "Jun", rent: 2450 },
];

const payments = [
  { date: "Jun 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Paid", statusColor: "#059669" },
  { date: "May 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Paid", statusColor: "#059669" },
  { date: "Apr 3, 2025", type: "Late Fee", amount: "$75.00", method: "Card", status: "Paid", statusColor: "#059669" },
  { date: "Apr 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Late (3 days)", statusColor: "#F59E0B", highlight: true },
  { date: "Mar 1, 2025", type: "Rent", amount: "$2,450", method: "ACH", status: "Paid", statusColor: "#059669" },
  { date: "Mar 1, 2025", type: "Security Deposit", amount: "$4,900", method: "Check", status: "Held in escrow", statusColor: "#515D66" },
];

export function PropertyRentalPage() {
  return (
    <PropertyLayout activeTab="rental">
      <div className="p-6 space-y-6 max-w-[1160px] mx-auto w-full">
        {/* Unit header */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded-lg" />
            <div>
              <p className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>Unit 4B — 123 Maple St, Chicago, IL 60601</p>
              <p className="text-[14px] text-muted-foreground">3 Bed / 2 Bath | 1,250 sq ft | Floor 4</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[#059669] text-[14px]">
            <span className="w-2 h-2 bg-[#059669] rounded-full" />
            Occupied
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-6">
          <KpiCard label="MONTHLY RENT" value="$2,450" sub="/mo" accent="↑ $150 above market avg" accentColor="#059669" />
          <KpiCard label="OCCUPANCY" value="Occupied" sub="" accent="Continuously for 6 months" accentColor="#059669" showBar />
          <KpiCard label="YTD NET INCOME" value="$21,875" sub="" accent="↑ +8.2% vs last year" accentColor="#059669" />
          <KpiCard label="BALANCE DUE" value="$0.00" sub="" accent="● Current" accentColor="#059669" />
        </div>

        {/* Financial Overview + Lease Summary */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Financial Overview</h3>
              <button className="border border-border rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground flex items-center gap-1">
                Jan – Jun 2025 📅
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#515D66" }} />
                <YAxis tick={{ fontSize: 12, fill: "#515D66" }} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="rent" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-8 mt-4 text-[14px]">
              <div>
                <p className="text-muted-foreground text-[12px]">Total Rent</p>
                <p className="text-foreground" style={{ fontWeight: 600 }}>$14,700</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[12px]">Expenses</p>
                <p className="text-[#E11D48]" style={{ fontWeight: 600 }}>$3,250</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[12px]">Net Income</p>
                <p className="text-[#059669]" style={{ fontWeight: 600 }}>$11,450 ↑ vs prior</p>
              </div>
            </div>
          </div>

          <div className="col-span-4 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Lease Summary</h3>
              <span className="bg-accent text-primary text-[12px] px-2 py-0.5 rounded">12-month</span>
            </div>
            <p className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Jane Smith</p>
            <button className="text-primary text-[12px] mb-3">→ View tenant profile</button>
            <div className="space-y-2 text-[14px]">
              {[
                ["Lease Start", "Mar 1, 2024"],
                ["Lease End", "Feb 28, 2025"],
                ["Rent", "$2,450/mo"],
                ["Deposit", "$4,900"],
                ["Auto-pay", "Active"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>{v === "Active" ? <span className="text-[#059669] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span> : v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-2 bg-[#FFFBEB] rounded-lg">
              <p className="text-[#F59E0B] text-[14px] flex items-center gap-1">🟧 Expires in 47 days</p>
            </div>
            <button className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-[14px] mt-3 hover:bg-primary/90">
              Send Renewal Offer
            </button>
          </div>
        </div>

        {/* Tenant, Maintenance, Documents */}
        <div className="grid grid-cols-3 gap-6">
          {/* Tenant Profile */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Tenant Profile</h3>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-[12px]">JS</div>
            </div>
            <p className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>Jane Smith</p>
            <div className="space-y-1.5 text-[14px] text-muted-foreground mt-2">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> jane@email.com</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> (312) 555-0192</div>
            </div>
            <div className="border-t border-border mt-4 pt-3 space-y-1.5 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moved in</span>
                <span className="text-foreground">Mar 1, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">On-time payments</span>
                <span className="text-foreground">98%</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="border border-border rounded-lg px-3 py-1.5 text-[14px] text-foreground hover:bg-accent/50">Message Tenant</button>
              <button className="text-primary text-[14px]">View Full Profile →</button>
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Maintenance</h3>
              <span className="bg-[#ECFDF5] text-[#059669] text-[12px] px-2 py-0.5 rounded-full">2 Open</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-[#E11D48] rounded-full mt-2 shrink-0" />
                <div>
                  <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>Leaky faucet — Kitchen</p>
                  <p className="text-[12px] text-muted-foreground">High priority · Assigned: Bob V.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-[#F59E0B] rounded-full mt-2 shrink-0" />
                <div>
                  <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>HVAC Filter Replacement</p>
                  <p className="text-[12px] text-muted-foreground">Medium priority · Scheduled: Jun 15</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4 border-t border-border pt-3">
              <button className="border border-border rounded-lg px-3 py-1.5 text-[14px] text-foreground hover:bg-accent/50">+ New Work Order</button>
              <button className="text-primary text-[14px]">View All Orders →</button>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-3" style={{ fontWeight: 600 }}>Documents</h3>
            <div className="space-y-3">
              {[
                { name: "Lease Agreement", status: "Active", statusColor: "#059669", date: "Signed Mar 1, 2024", icon: "🔵" },
                { name: "Move-in Checklist", status: "", statusColor: "", date: "Mar 1, 2024", icon: "⚫" },
                { name: "Insurance Certificate", status: "Expiring", statusColor: "#F59E0B", date: "Exp: Dec 2025", icon: "🟧" },
              ].map((doc) => (
                <div key={doc.name} className="flex items-start gap-2">
                  <span className="text-[14px]">{doc.icon}</span>
                  <div>
                    <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>{doc.name}</p>
                    <p className="text-[12px]">
                      {doc.status && <span style={{ color: doc.statusColor }}>{doc.status} · </span>}
                      <span className="text-muted-foreground">{doc.date}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4 border-t border-border pt-3">
              <button className="border border-border rounded-lg px-3 py-1.5 text-[14px] text-foreground hover:bg-accent/50">Upload Document</button>
              <button className="text-primary text-[14px]">View All Docs →</button>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Payment History</h3>
            <div className="flex items-center gap-3">
              <button className="border border-border rounded-lg px-3 py-1.5 text-[14px] text-foreground flex items-center gap-1">
                Filter 🔽
              </button>
              <button className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-[14px] flex items-center gap-1">
                🔵 Export CSV
              </button>
            </div>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-muted-foreground text-[12px] border-b border-border">
                <th className="text-left pb-2">Date</th>
                <th className="text-left pb-2">Type</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Method</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i} className={`border-b border-border ${p.highlight ? "bg-[#FFFBEB]/50" : ""}`}>
                  <td className="py-3 text-foreground">{p.date}</td>
                  <td className="py-3 text-foreground">{p.type}</td>
                  <td className="py-3 text-foreground">{p.amount}</td>
                  <td className="py-3 text-muted-foreground">{p.method}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-1" style={{ color: p.statusColor }}>
                      <Circle className="w-2 h-2 fill-current" />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-[14px] text-muted-foreground">Showing 1-6 of 24 payments</span>
            <div className="flex items-center gap-2">
              <button className="border border-border rounded px-3 py-1 text-[14px] text-muted-foreground flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <span className="text-[14px] text-muted-foreground">Page 1 of 4</span>
              <button className="bg-primary text-primary-foreground rounded px-3 py-1 text-[14px] flex items-center gap-1">
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}

function KpiCard({ label, value, sub, accent, accentColor, showBar = false }: {
  label: string; value: string; sub: string; accent: string; accentColor: string; showBar?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] text-muted-foreground tracking-wider mb-1">{label}</p>
      <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>{value}</p>
      {sub && <p className="text-[14px] text-muted-foreground">{sub}</p>}
      {showBar && (
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-1 mb-1">
          <div className="h-full bg-[#059669] rounded-full w-full" />
        </div>
      )}
      <p className="text-[12px] mt-1" style={{ color: accentColor }}>{accent}</p>
    </div>
  );
}
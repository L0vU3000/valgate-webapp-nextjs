"use client";

import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Check, AlertTriangle, ExternalLink } from "lucide-react";

const valueHistory = [
  { month: "Jan", price: 380000 },
  { month: "Feb", price: 400000 },
  { month: "Mar", price: 420000 },
  { month: "Apr", price: 410000 },
  { month: "May", price: 440000 },
  { month: "Jun", price: 460000 },
  { month: "Jul", price: 485000 },
  { month: "Aug", price: 470000 },
  { month: "Sep", price: 465000 },
  { month: "Oct", price: 475000 },
  { month: "Nov", price: 480000 },
  { month: "Dec", price: 485000 },
];

const comparables = [
  { address: "1847 Oak Street", dist: "0.3 mi away", built: "Feb 2026", type: "House", builtYear: "Built '18", beds: "3/2", sqft: "1,850", price: "$492,000", psqft: "$266/sqft" },
  { address: "1847 Oak Street", dist: "0.3 mi away", built: "Feb 2026", type: "House", builtYear: "Built '18", beds: "3/2", sqft: "1,850", price: "$492,000", psqft: "$266/sqft" },
  { address: "1847 Oak Street", dist: "0.3 mi away", built: "Feb 2026", type: "House", builtYear: "Built '18", beds: "3/2", sqft: "1,850", price: "$492,000", psqft: "$266/sqft" },
  { address: "1847 Oak Street", dist: "0.3 mi away", built: "Feb 2026", type: "House", builtYear: "Built '18", beds: "3/2", sqft: "1,850", price: "$492,000", psqft: "$266/sqft" },
];

export function PropertyValuationPage() {
  return (
    <PropertyLayout activeTab="valuation">
      <div className="p-6 space-y-6 max-w-[1160px] mx-auto w-full">
        {/* Title */}
        <h1 className="text-[30px] text-foreground" style={{ fontWeight: 600 }}>
          Valuation for <span style={{ fontWeight: 800 }}>SR00015</span>
        </h1>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[12px] text-muted-foreground mb-1">Current Market Value</p>
            <p className="text-[30px] text-foreground" style={{ fontWeight: 700 }}>$485,000</p>
            <p className="text-[12px] text-[#059669]">▲ +$18,500 (3.96%)</p>
            <p className="text-[12px] text-muted-foreground">Since last quarter</p>
            <button className="text-primary text-[12px] mt-2">Update Estimates →</button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[12px] text-muted-foreground mb-1">Current Market Value</p>
            <p className="text-[30px] text-foreground" style={{ fontWeight: 700 }}>$2,850/mo</p>
            <p className="text-[12px] text-muted-foreground">Your current: $2,650</p>
            <p className="text-[12px] text-[#059669]">↗ $200/mo potential</p>
            <button className="text-primary text-[12px] mt-2">View Rental →</button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[12px] text-muted-foreground mb-1">Total Appreciation</p>
            <p className="text-[30px] text-[#059669]" style={{ fontWeight: 700 }}>+$112,500</p>
            <p className="text-[14px] text-foreground">30.2% gain</p>
            <p className="text-[12px] text-muted-foreground">Since purchase (Dec 2019)</p>
            <button className="text-primary text-[12px] mt-2">View Full History →</button>
          </div>
        </div>

        {/* Value History + Market Insight */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Property Value History</h3>
              <button className="border border-border rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground">
                Year 📅
              </button>
            </div>
            <div className="flex items-center gap-4 mb-3 text-[12px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full" /> Price</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-muted-foreground rounded-full" /> Market Price</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={valueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#515D66" }} />
                <YAxis tick={{ fontSize: 12, fill: "#515D66" }} tickFormatter={(v) => `${v / 1000}`} domain={[0, 'auto']} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-5 bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Market Insight</h3>
            <p className="text-[12px] text-muted-foreground mb-1">Your Neighbourhood</p>
            <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Phnom Penh, Cambodia</p>

            <div className="mt-4">
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Market Conditions</p>
              <div className="mt-2">
                <p className="text-[12px] text-muted-foreground">Avg. Days on Market</p>
                <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>42 days</p>
                <p className="text-[12px] text-[#059669]">30.2% gain</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[12px] text-muted-foreground mb-1">Inventory Level</p>
              <p className="text-[30px] text-[#E11D48]" style={{ fontWeight: 700 }}>Low</p>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-3 w-6 rounded ${i <= 2 ? "bg-[#F59E0B]" : "bg-muted"}`} />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[30px] text-[#059669]" style={{ fontWeight: 700 }}>High</p>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-3 w-6 rounded ${i <= 4 ? "bg-[#059669]" : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-[14px] text-foreground mt-2" style={{ fontWeight: 600 }}>Market Trend: Seller's Market</p>
              <p className="text-[12px] text-muted-foreground">Properties selling 12% above list price on average</p>
            </div>
          </div>
        </div>

        {/* Comparable Properties */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Comparable Properties in Your Area</h3>
              <p className="text-[12px] text-muted-foreground">Properties similar to yours that sold recently</p>
            </div>
            <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50">
              View Full Report
            </button>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-muted-foreground text-[12px] border-b border-border">
                <th className="text-left pb-2">Address</th>
                <th className="text-left pb-2">Type</th>
                <th className="text-left pb-2">Beds/Bath</th>
                <th className="text-left pb-2">Sq Ft</th>
                <th className="text-left pb-2">Sold Price</th>
                <th className="text-left pb-2">Sale Contract</th>
              </tr>
            </thead>
            <tbody>
              {comparables.map((c, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-3">
                    <p className="text-foreground">{c.address}</p>
                    <p className="text-[12px] text-muted-foreground">{c.dist} · {c.built}</p>
                  </td>
                  <td className="py-3">
                    <p className="text-foreground">{c.type}</p>
                    <p className="text-[12px] text-muted-foreground">{c.builtYear}</p>
                  </td>
                  <td className="py-3 text-foreground">{c.beds}</td>
                  <td className="py-3 text-foreground">{c.sqft}</td>
                  <td className="py-3">
                    <p className="text-foreground">{c.price}</p>
                    <p className="text-[12px] text-muted-foreground">{c.psqft}</p>
                  </td>
                  <td className="py-3"><button className="text-primary text-[14px]">View Contract</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[12px] text-muted-foreground mt-3">
            Average comp price: <span className="text-foreground" style={{ fontWeight: 600 }}>$492,100</span> · Your estimated value: <span className="text-foreground" style={{ fontWeight: 600 }}>$485,000</span>
          </p>
        </div>

        {/* Investment Performance + Impact + Appraisal */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Investment Performance</h3>
            <div className="space-y-3 text-[14px]">
              {[
                ["Cash-on-Cash Return", "8.4%"],
                ["Cap Rate", "6.2%"],
                ["Total ROI (Since Purchase)", "42.7%"],
                ["Equity Gained", "$137,800"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
            <button className="text-primary text-[14px] mt-4">View Detailed Report →</button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-3" style={{ fontWeight: 600 }}>What Impacts Your Value</h3>
            <p className="text-[#059669] text-[12px] mb-2" style={{ fontWeight: 600 }}>Positive Factors:</p>
            <div className="space-y-1 text-[14px] text-foreground mb-4">
              {["Recent kitchen renovation", "Low crime area", "Top-rated schools nearby", "New transit line opening"].map((f) => (
                <p key={f} className="flex items-start gap-1">
                  <Check className="w-3 h-3 text-[#059669] mt-1 shrink-0" />
                  {f}
                </p>
              ))}
            </div>
            <p className="text-[#F59E0B] text-[12px] mb-2" style={{ fontWeight: 600 }}>Improvement Opportunities:</p>
            <div className="space-y-1 text-[14px] text-foreground">
              {["Outdated bathrooms", "Aging HVAC system", "Limited curb appeal"].map((f) => (
                <p key={f} className="flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 text-[#F59E0B] mt-1 shrink-0" />
                  {f}
                </p>
              ))}
            </div>
            <button className="text-primary text-[14px] mt-3">Get Improvement Estimates →</button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-3" style={{ fontWeight: 600 }}>Get Professional Appraisal</h3>
            <p className="text-[14px] text-muted-foreground mb-4">
              Our estimates use public data and algorithms. For the most accurate valuation (required for refinancing or selling):
            </p>
            <div className="border border-border rounded-xl p-4 mb-4">
              <p className="text-[14px] text-foreground mb-2" style={{ fontWeight: 600 }}>Professional Appraisal</p>
              <ul className="space-y-1 text-[14px] text-muted-foreground">
                <li>• Licensed appraiser</li>
                <li>• Bank-acceptable report</li>
                <li>• 3-5 business days</li>
                <li>• Starting at $350</li>
              </ul>
            </div>
            <button className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-[14px] hover:bg-primary/90 mb-2">
              Request Appraisal
            </button>
            <button className="w-full text-foreground text-[14px] py-2">Learn More</button>
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}
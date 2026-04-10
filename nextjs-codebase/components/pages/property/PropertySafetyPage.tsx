"use client";

import { PropertyLayout } from "@/components/property/PropertyLayout";
import { Check, AlertTriangle, Shield, Phone, ExternalLink } from "lucide-react";

const certifications = [
  { name: "Fire Safety Certificate", status: "Valid", statusColor: "#059669", issued: "Apr 29, 2025", expires: "Apr 29, 2026", inspector: "Fire Dept, District 3" },
  { name: "Electrical Safety", status: "Valid", statusColor: "#059669", issued: "Apr 28, 2025", expires: "Apr 29, 2026", inspector: "Fire Dept, District 3" },
  { name: "Gas Safety", status: "Expires Soon", statusColor: "#F59E0B", issued: "Apr 29, 2025", expires: "Apr 29, 2026", inspector: "Fire Dept, District 3" },
  { name: "Structural Integrity", status: "Valid", statusColor: "#059669", issued: "Apr 29, 2025", expires: "Apr 29, 2026", inspector: "Fire Dept, District 3" },
  { name: "Asbestos Survey", status: "Valid", statusColor: "#059669", issued: "Apr 29, 2025", expires: "Apr 29, 2026", inspector: "Fire Dept, District 3" },
  { name: "EICR Certificate", status: "Valid", statusColor: "#059669", issued: "Apr 29, 2025", expires: "Apr 29, 2026", inspector: "Fire Dept, District 3" },
];

const inspections = [
  { date: "Apr 29, 2025", type: "Fire Safety", inspector: "Fire Dept, District 3", status: "Passed", statusColor: "#059669", issues: 0 },
  { date: "Apr 29, 2025", type: "Fire Safety", inspector: "Fire Dept, District 3", status: "Satisfactory", statusColor: "#F59E0B", issues: 0 },
  { date: "Apr 29, 2025", type: "Fire Safety", inspector: "Fire Dept, District 3", status: "Clear", statusColor: "#059669", issues: 0 },
  { date: "Apr 29, 2025", type: "Fire Safety", inspector: "Fire Dept, District 3", status: "Minor Issue", statusColor: "#E11D48", issues: 2 },
  { date: "Apr 29, 2025", type: "Fire Safety", inspector: "Fire Dept, District 3", status: "Clear", statusColor: "#059669", issues: 0 },
];

const risks = [
  { severity: "#F59E0B", title: "Minor Cosmetic Damage", desc: "Small crack in exterior wall - monitored, no structural concern. Scheduled for cosmetic repair Q3 2026." },
  { severity: "#F59E0B", title: "Drainage System Maintenance", desc: "Annual drainage inspection due May 2026. Property in flood zone 2 - recommend maintaining comprehensive insurance coverage." },
  { severity: "#E11D48", title: "Tree Maintenance", desc: "Large oak tree near property boundary. Recommend annual arborist inspection to prevent potential subsidence issues." },
];

const emergencyContacts = [
  { name: "Fire Department", phone: "+1 (555) 911-0001", sub: "District 3 Fire Station", color: "#E11D48" },
  { name: "Emergency Electrician", phone: "+1 (555) 911-0001", sub: "SafeWire 24/7 Service", color: "#F59E0B" },
  { name: "Emergency Plumber", phone: "+1 (555) 911-0001", sub: "QuickFix Plumbing", color: "#2563EB" },
  { name: "Gas Emergency", phone: "+1 (555) 911-0001", sub: "Gas Safe Emergency Line", color: "#F59E0B" },
  { name: "Property Insurance", phone: "+1 (555) 911-0001", sub: "Guardian Property Insurance", color: "#059669" },
  { name: "Structural Engineer", phone: "+1 (555) 911-0001", sub: "BuildRight Engineers", color: "#515D66" },
];

export function PropertySafetyPage() {
  return (
    <PropertyLayout activeTab="safety">
      <div className="p-6 space-y-6 max-w-[1160px] mx-auto w-full">
        {/* Title */}
        <h1 className="text-[30px] text-foreground" style={{ fontWeight: 600 }}>
          Safety for <span style={{ fontWeight: 800 }}>SR00015</span>
        </h1>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
            <div className="relative w-[80px] h-[80px] mb-2">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E8EAED" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="8"
                  strokeDasharray={`${78.6 * 2.51} ${100 * 2.51}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[20px] text-[#059669]" style={{ fontWeight: 700 }}>78.6%</span>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">All certifications current</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
            <Check className="w-10 h-10 text-[#059669] mb-2" />
            <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Compliance Status</p>
            <p className="text-[24px] text-[#059669]" style={{ fontWeight: 700 }}>Compliant</p>
            <p className="text-[12px] text-muted-foreground">All certifications current</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-[#F59E0B] mb-2" />
            <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Next Inspection</p>
            <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>18 days</p>
            <p className="text-[12px] text-muted-foreground">Fire safety · Apr 29, 2026</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
            <Shield className="w-10 h-10 text-[#2563EB] mb-2" />
            <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Open Issues</p>
            <p className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>2</p>
            <p className="text-[12px] text-muted-foreground">1 low priority, 1 medium</p>
          </div>
        </div>

        {/* Safety Certifications */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Safety Certifications</h3>
            <button className="text-primary text-[14px]">Add Certificate</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {certifications.map((c) => (
              <div key={c.name} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>{c.name}</p>
                  <span className="text-[12px] flex items-center gap-1" style={{ color: c.statusColor }}>
                    {c.status === "Valid" ? <Check className="w-3 h-3" /> : null}
                    {c.status}
                  </span>
                </div>
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issued:</span>
                    <span className="text-foreground">{c.issued}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="text-foreground">{c.expires}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inspector:</span>
                    <span className="text-foreground">{c.inspector}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inspection History */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Inspection History</h3>
            <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50">
              Schedule Inspection
            </button>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-muted-foreground text-[12px] border-b border-border">
                <th className="text-left pb-2">Date</th>
                <th className="text-left pb-2">Type</th>
                <th className="text-left pb-2">Inspector</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-left pb-2">Issue Found</th>
                <th className="text-left pb-2">Report</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((insp, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-3 text-foreground">{insp.date}</td>
                  <td className="py-3 text-foreground">{insp.type}</td>
                  <td className="py-3 text-muted-foreground">{insp.inspector}</td>
                  <td className="py-3"><span style={{ color: insp.statusColor }}>{insp.status}</span></td>
                  <td className="py-3 text-foreground">{insp.issues}</td>
                  <td className="py-3"><button className="text-primary text-[14px]">View report</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk Assessment */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Risk Assessment</h3>
          <div className="space-y-4">
            {risks.map((r) => (
              <div key={r.title} className="flex items-start gap-3 p-4 border border-border rounded-xl">
                <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: r.severity }} />
                <div>
                  <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>{r.title}</p>
                  <p className="text-[14px] text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Emergency Contacts</h3>
            <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50">
              Edit Contacts
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {emergencyContacts.map((ec) => (
              <div key={ec.name} className="border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: ec.color + "20" }}>
                  <Phone className="w-5 h-5" style={{ color: ec.color }} />
                </div>
                <div>
                  <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>{ec.name}</p>
                  <p className="text-[14px] text-primary">{ec.phone}</p>
                  <p className="text-[12px] text-muted-foreground">{ec.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}
import type { NewInspection } from "@/lib/data/db/inspections";
import type { NewCertification } from "@/lib/data/db/certifications";
import type { NewEmergencyContact } from "@/lib/data/db/emergency-contacts";
import type { NewSafetyRisk } from "@/lib/data/db/safety-risks";

const now = Date.UTC(2026, 3, 1);

export const inspections: NewInspection[] = [
  {
    propertyId: "PROP-0001",
    date: "Mar 14, 2026",
    type: "Annual Fire Safety",
    inspector: "Noun Sreymom",
    status: "Passed",
    issues: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    date: "Sep 22, 2025",
    type: "Electrical",
    inspector: "Heng Virak",
    status: "Satisfactory",
    issues: 2,
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    date: "Feb 02, 2026",
    type: "Plumbing",
    inspector: "Chea Sophal",
    status: "Failed",
    issues: 5,
    createdAt: now,
    updatedAt: now,
  },
];

export const certifications: NewCertification[] = [
  {
    propertyId: "PROP-0001",
    name: "Fire Safety Certificate",
    status: "Valid",
    issued: "Mar 14, 2026",
    expires: "Mar 14, 2027",
    inspector: "Noun Sreymom",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    name: "Electrical Compliance",
    status: "Expiring",
    issued: "Sep 22, 2024",
    expires: "Sep 22, 2026",
    inspector: "Heng Virak",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    name: "Plumbing Certificate",
    status: "Expired",
    issued: "Feb 02, 2024",
    expires: "Feb 02, 2026",
    inspector: "Chea Sophal",
    createdAt: now,
    updatedAt: now,
  },
];

export const emergencyContacts: NewEmergencyContact[] = [
  {
    propertyId: "PROP-0001",
    name: "Pro Fix Cambodia",
    phone: "+855 23 555 0101",
    sub: "24/7 Maintenance",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    name: "Virak Electric Co.",
    phone: "+855 23 555 0102",
    sub: "Electrical emergencies",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    name: "Phnom Penh Fire Brigade",
    phone: "118",
    sub: "Fire / rescue",
    createdAt: now,
    updatedAt: now,
  },
];

export const safetyRisks: NewSafetyRisk[] = [
  {
    propertyId: "PROP-0006",
    severityLabel: "High",
    title: "Outdated wiring",
    desc: "Knob-and-tube wiring in west wall — needs full replacement before next inspection.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0011",
    severityLabel: "Medium",
    title: "Smoke alarm overdue",
    desc: "Two smoke alarms on second floor have not been tested in 14 months.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    severityLabel: "Low",
    title: "Loose handrail",
    desc: "Front porch handrail wobbles — schedule cosmetic repair within the quarter.",
    createdAt: now,
    updatedAt: now,
  },
];

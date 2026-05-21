import type { NewInspection } from "@/lib/data/db/inspections";
import type { NewCertification } from "@/lib/data/db/certifications";
import type { NewEmergencyContact } from "@/lib/data/db/emergency-contacts";
import type { NewSafetyRisk } from "@/lib/data/db/safety-risks";

const now = Date.UTC(2026, 3, 1);

export const inspections: NewInspection[] = [
  {
    propertyId: "PROP-0001",
    inspectedAt: 1773421200000,
    type: "Annual Fire Safety",
    inspectorId: "PROF-0005",
    status: "Passed",
    issues: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    inspectedAt: 1758474000000,
    type: "Electrical",
    inspectorId: "PROF-0003",
    status: "Satisfactory",
    issues: 2,
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    inspectedAt: 1769965200000,
    type: "Plumbing",
    inspectorId: "PROF-0002",
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
    issuedAt: 1773421200000,
    expiresAt: 1804957200000,
    inspectorId: "PROF-0005",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    name: "Electrical Compliance",
    status: "Expiring",
    issuedAt: 1726938000000,
    expiresAt: 1790010000000,
    inspectorId: "PROF-0003",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    name: "Plumbing Certificate",
    status: "Expired",
    issuedAt: 1706806800000,
    expiresAt: 1769965200000,
    inspectorId: "PROF-0002",
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
    severity: "High",
    title: "Outdated wiring",
    description: "Knob-and-tube wiring in west wall — needs full replacement before next inspection.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0011",
    severity: "Medium",
    title: "Smoke alarm overdue",
    description: "Two smoke alarms on second floor have not been tested in 14 months.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    severity: "Low",
    title: "Loose handrail",
    description: "Front porch handrail wobbles — schedule cosmetic repair within the quarter.",
    createdAt: now,
    updatedAt: now,
  },
];

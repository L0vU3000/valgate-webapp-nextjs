import type { NewInspection } from "@/lib/data/db/inspections";
import type { NewCertification } from "@/lib/data/db/certifications";
import type { NewEmergencyContact } from "@/lib/data/db/emergency-contacts";
import type { NewSafetyRisk } from "@/lib/data/db/safety-risks";

const now = Date.UTC(2026, 3, 1);

export const inspections: NewInspection[] = [
  // PROP-0001 — Boeung Trabek (Rented commercial)
  {
    propertyId: "PROP-0001",
    inspectedAt: Date.UTC(2026, 2, 15),
    type: "Annual Fire Safety",
    inspectorId: "PROF-0005",
    status: "Passed",
    issues: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    inspectedAt: Date.UTC(2025, 11, 10),
    type: "Electrical",
    inspectorId: "PROF-0003",
    status: "Satisfactory",
    issues: 1,
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0010 — BKK1 191D (Rented commercial)
  {
    propertyId: "PROP-0010",
    inspectedAt: Date.UTC(2025, 11, 5),
    type: "Electrical",
    inspectorId: "PROF-0003",
    status: "Satisfactory",
    issues: 2,
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0010",
    inspectedAt: Date.UTC(2025, 8, 20),
    type: "Annual Fire Safety",
    inspectorId: "PROF-0005",
    status: "Passed",
    issues: 0,
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0011 — BKK1 Corner Residence (Owner-Occupied)
  {
    propertyId: "PROP-0011",
    inspectedAt: Date.UTC(2025, 10, 12),
    type: "Annual Fire Safety",
    inspectorId: "PROF-0002",
    status: "Passed",
    issues: 0,
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0012 — BKK1 Family Home (Owner-Occupied)
  {
    propertyId: "PROP-0012",
    inspectedAt: Date.UTC(2025, 9, 8),
    type: "Electrical",
    inspectorId: "PROF-0002",
    status: "Satisfactory",
    issues: 1,
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0013 — Chak Angre A (Rented)
  {
    propertyId: "PROP-0013",
    inspectedAt: Date.UTC(2025, 10, 1),
    type: "Plumbing",
    inspectorId: "PROF-0004",
    status: "Failed",
    issues: 5,
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0014 — Chak Angre B (Rented)
  {
    propertyId: "PROP-0014",
    inspectedAt: Date.UTC(2025, 9, 15),
    type: "Annual Fire Safety",
    inspectorId: "PROF-0005",
    status: "Satisfactory",
    issues: 2,
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0017 — BKK1 Villa (Vacant, pre-rental)
  {
    propertyId: "PROP-0017",
    inspectedAt: Date.UTC(2026, 1, 20),
    type: "Annual Fire Safety",
    inspectorId: "PROF-0002",
    status: "Passed",
    issues: 0,
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0021 — Prek Leab Shophouse
  {
    propertyId: "PROP-0021",
    inspectedAt: Date.UTC(2025, 8, 5),
    type: "Annual Fire Safety",
    inspectorId: "PROF-0005",
    status: "Passed",
    issues: 0,
    createdAt: now,
    updatedAt: now,
  },
];

export const certifications: NewCertification[] = [
  // PROP-0001
  {
    propertyId: "PROP-0001",
    name: "Fire Safety Certificate",
    status: "Valid",
    issuedAt: Date.UTC(2026, 2, 15),
    expiresAt: Date.UTC(2027, 2, 15),
    inspectorId: "PROF-0005",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    name: "Electrical Compliance",
    status: "Expiring",
    issuedAt: Date.UTC(2024, 11, 10),
    expiresAt: Date.UTC(2026, 5, 10),
    inspectorId: "PROF-0003",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0010
  {
    propertyId: "PROP-0010",
    name: "Fire Safety Certificate",
    status: "Valid",
    issuedAt: Date.UTC(2025, 8, 20),
    expiresAt: Date.UTC(2026, 8, 20),
    inspectorId: "PROF-0005",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0010",
    name: "Electrical Compliance",
    status: "Expiring",
    issuedAt: Date.UTC(2025, 11, 5),
    expiresAt: Date.UTC(2026, 5, 5),
    inspectorId: "PROF-0003",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0011
  {
    propertyId: "PROP-0011",
    name: "Fire Safety Certificate",
    status: "Valid",
    issuedAt: Date.UTC(2025, 10, 12),
    expiresAt: Date.UTC(2026, 10, 12),
    inspectorId: "PROF-0005",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0012
  {
    propertyId: "PROP-0012",
    name: "Electrical Compliance",
    status: "Valid",
    issuedAt: Date.UTC(2025, 9, 8),
    expiresAt: Date.UTC(2026, 9, 8),
    inspectorId: "PROF-0003",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0013
  {
    propertyId: "PROP-0013",
    name: "Plumbing Certificate",
    status: "Expired",
    issuedAt: Date.UTC(2024, 3, 1),
    expiresAt: Date.UTC(2025, 3, 1),
    inspectorId: "PROF-0004",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0014
  {
    propertyId: "PROP-0014",
    name: "Fire Safety Certificate",
    status: "Valid",
    issuedAt: Date.UTC(2025, 9, 15),
    expiresAt: Date.UTC(2026, 9, 15),
    inspectorId: "PROF-0005",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0017
  {
    propertyId: "PROP-0017",
    name: "Fire Safety Certificate",
    status: "Valid",
    issuedAt: Date.UTC(2026, 1, 20),
    expiresAt: Date.UTC(2027, 1, 20),
    inspectorId: "PROF-0002",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0021
  {
    propertyId: "PROP-0021",
    name: "Fire Safety Certificate",
    status: "Valid",
    issuedAt: Date.UTC(2025, 8, 5),
    expiresAt: Date.UTC(2026, 8, 5),
    inspectorId: "PROF-0005",
    createdAt: now,
    updatedAt: now,
  },
];

export const emergencyContacts: NewEmergencyContact[] = [
  // PROP-0001
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

  // PROP-0010
  {
    propertyId: "PROP-0010",
    name: "Phnom Penh Fire Brigade",
    phone: "118",
    sub: "Fire / rescue",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0010",
    name: "Pro Fix Cambodia",
    phone: "+855 23 555 0101",
    sub: "24/7 Maintenance",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0011
  {
    propertyId: "PROP-0011",
    name: "Sokha Home Services",
    phone: "+855 17 888 222",
    sub: "Residential maintenance",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0011",
    name: "Phnom Penh Fire Brigade",
    phone: "118",
    sub: "Fire / rescue",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0012
  {
    propertyId: "PROP-0012",
    name: "Sokha Home Services",
    phone: "+855 17 888 222",
    sub: "Residential maintenance",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0013
  {
    propertyId: "PROP-0013",
    name: "Chan Plumbing Services",
    phone: "+855 16 543 210",
    sub: "Plumbing emergencies",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0013",
    name: "Phnom Penh Fire Brigade",
    phone: "118",
    sub: "Fire / rescue",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0014
  {
    propertyId: "PROP-0014",
    name: "Pro Fix Cambodia",
    phone: "+855 23 555 0101",
    sub: "24/7 Maintenance",
    createdAt: now,
    updatedAt: now,
  },
];

export const safetyRisks: NewSafetyRisk[] = [
  {
    propertyId: "PROP-0013",
    severity: "High",
    title: "Outdated wiring",
    description: "Knob-and-tube wiring in ground floor commercial space — needs full replacement before next inspection.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0010",
    severity: "Medium",
    title: "Smoke alarms overdue for testing",
    description: "Upper floor smoke alarms have not been tested in 14 months — schedule testing immediately.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    severity: "Low",
    title: "Loose entrance gate",
    description: "Front gate hinge is loose — schedule cosmetic repair within the quarter.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0014",
    severity: "Medium",
    title: "Roof tiles need replacement",
    description: "Three roof tiles on the south-facing side are cracked — risk of water ingress in rainy season.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0012",
    severity: "Low",
    title: "Aging water heater",
    description: "Water heater unit is 8 years old — approaching end of service life, plan replacement.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0017",
    severity: "Low",
    title: "Overgrown garden",
    description: "Unoccupied villa — garden overgrowth around perimeter fence should be cleared before rental listing.",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0018",
    severity: "Low",
    title: "Window seal deterioration",
    description: "Bathroom window seal on east wall showing minor deterioration — re-seal before next wet season.",
    createdAt: now,
    updatedAt: now,
  },
];

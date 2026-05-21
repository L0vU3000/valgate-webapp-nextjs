// Derived from .claude/data-audit/ref/09-page-wiring-status.md + pages/INDEX.md
// Update when an entity ships or a new page fully wires it.
export type WiringStatus = "wired" | "partial" | "missing" | "stub";

export const ENTITY_WIRING: Record<string, WiringStatus> = {
  // Identity
  users: "stub",
  "user-profiles": "wired",
  professionals: "wired",

  // Comms
  notifications: "wired",
  "notification-preferences": "wired",

  // File Management
  folders: "wired",
  documents: "wired",

  // Property core
  properties: "wired",
  "property-valuations": "wired",
  "land-parcels": "wired",

  // Rental
  tenants: "wired",
  leases: "wired",

  // Finance
  payments: "wired",
  expenses: "missing",

  // Compliance & Safety
  inspections: "wired",
  certifications: "wired",
  "maintenance-items": "wired",
  "safety-risks": "wired",
  "emergency-contacts": "wired",

  // Estate & Ownership
  "co-owners": "wired",
  "ownership-records": "wired",
  "ownership-documents": "wired",
  "ownership-history": "wired",
  successors: "wired",
  "estate-assignments": "wired",
  "estate-activity-events": "missing",
};

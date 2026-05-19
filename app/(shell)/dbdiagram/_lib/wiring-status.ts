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

  // Compliance & Safety (/safety page deferred)
  inspections: "wired",
  certifications: "partial",
  "maintenance-items": "wired",
  "safety-risks": "partial",
  "emergency-contacts": "partial",

  // Estate & Ownership
  "co-owners": "wired",
  "ownership-records": "wired",
  "ownership-documents": "wired",
  "ownership-history": "wired",
  successors: "wired",
  "successor-property-assignments": "missing",
  "estate-activity-events": "missing",
};

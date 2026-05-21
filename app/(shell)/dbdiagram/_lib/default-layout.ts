// Default positions are now produced by Dagre (see dagre-layout.ts) at request
// time. This module owns only the color palette + UI presets.

// Each constant is the Tailwind -200 tint of the matching group border (-600).
const IDENTITY        = "#cbd5e1"; // slate-200   → border #94a3b8 (slate-400)
const PROPERTY        = "#fbcfe8"; // pink-200    → border #db2777 (pink-600)
const RENTAL          = "#bbf7d0"; // green-200   → border #16a34a (green-600)
const FINANCE         = "#bfdbfe"; // blue-200    → border #2563eb (blue-600)
const COMMS           = "#fde68a"; // amber-200   → border #d97706 (amber-600)
const FILE_MANAGEMENT = "#a5f3fc"; // cyan-200    → border #0891b2 (cyan-600)
const COMPLIANCE      = "#fecaca"; // red-200     → border #dc2626 (red-600)
const ESTATE          = "#ddd6fe"; // violet-200  → border #7c3aed (violet-600)

export const ENTITY_PALETTE: Record<string, string> = {
  // Identity
  users:              IDENTITY,
  "user-profiles":    IDENTITY,
  professionals:      IDENTITY,

  // Property core
  properties:             PROPERTY,
  "land-parcels":         PROPERTY,
  "property-valuations":  PROPERTY,

  // Rental
  tenants: RENTAL,
  leases:  RENTAL,

  // Finance
  payments: FINANCE,
  expenses: FINANCE,

  // Comms
  notifications:              COMMS,
  "notification-preferences": COMMS,

  // File Management
  folders:   FILE_MANAGEMENT,
  documents: FILE_MANAGEMENT,

  // Compliance & Safety
  inspections:        COMPLIANCE,
  certifications:     COMPLIANCE,
  "maintenance-items": COMPLIANCE,
  "safety-risks":     COMPLIANCE,
  "emergency-contacts": COMPLIANCE,

  // Estate & Ownership
  "co-owners":                      ESTATE,
  "ownership-records":              ESTATE,
  "ownership-documents":            ESTATE,
  "ownership-history":              ESTATE,
  successors:                       ESTATE,
  "estate-assignments": ESTATE,
  "estate-activity-events":         ESTATE,
};

export const PRESET_COLORS = [
  IDENTITY,
  PROPERTY,
  RENTAL,
  FINANCE,
  COMMS,
  FILE_MANAGEMENT,
  COMPLIANCE,
  ESTATE,
];

export function defaultColorFor(name: string): string {
  return ENTITY_PALETTE[name] ?? "#e2e8f0";
}

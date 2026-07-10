// Shared property-linkage for the workbook importers (tenants, valuations, …).
//
// Every entity that imports from a client workbook carries a raw property reference — a label, a
// title, or the client's own property ID — that must be resolved to a REAL Valgate property id
// before anything is created. That resolution is identical across entities, so it lives here and
// both tenant-import and valuation-import call it (rather than each re-implementing the match).

// The minimal property fields resolveProperty needs (kept narrow for testability).
export type PropertyMatch = { id: string; name: string; code?: string | null; title?: string | null };

// Match a workbook property value against the org's real properties by EXACT (case-insensitive)
// id, name, code, or title. Returns the Valgate property id, or "" when nothing matches. PURE.
//
// Deliberately exact-only: loose substring matching would silently auto-link a record to the WRONG
// property (e.g. sheet value "Unit 10" matching a property "Unit 1"), which corrupts data invisibly.
// An unmatched row is safe — the review table flags it and shows a property picker, so the user
// resolves it explicitly.
//
// id is included because some sheets reference a property by its Valgate id (e.g. the valuation
// history sheet's "Property ID" column holds values like "PROP-0001"); tenant sheets reference by
// label, so adding id here never changes what a name/label resolves to.
export function resolveProperty(rawProperty: string, properties: PropertyMatch[]): string {
  const raw = rawProperty.trim().toLowerCase();
  if (!raw) return "";

  const match = properties.find(
    (p) =>
      p.id.trim().toLowerCase() === raw ||
      p.name.trim().toLowerCase() === raw ||
      (p.code ?? "").trim().toLowerCase() === raw ||
      (p.title ?? "").trim().toLowerCase() === raw,
  );
  return match ? match.id : "";
}

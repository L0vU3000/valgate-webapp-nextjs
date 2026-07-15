/**
 * Regression test for the co-owner data-loss bug in the Ownership edit wizard.
 * Ticket: agent-loop/orchestrator/inbox/2026-07-15-coowner-data-loss.md
 *
 * Broken behavior: when the wizard's "Co-owners" step is Skipped (shouldSkip fires
 * because the loaded ownership record's holdingType is "Sole Ownership"), saving the
 * wizard deletes every existing co-owner on the property (QA: COOWN-0001/0002 wiped).
 *
 * Expected behavior (per ticket): a save in which the user never edited the
 * co-owners step leaves the property's existing co-owners untouched.
 *
 * The test drives the REAL wizard config from OwnershipUnlock.tsx through the exact
 * pipeline FeatureUnlockWizard.handleSubmitData runs:
 *   loadInitial → schema.safeParse → onSubmitData
 * The server-action boundary is replaced with an in-memory co-owner store (the real
 * actions need a Clerk request context), so the assertion is purely about what the
 * wizard's save orchestration DOES to existing co-owners.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CoOwner } from "@/lib/data/types/co-owner";

// ── In-memory stand-in for the co-owner server actions ────────────────────────
// vi.hoisted so the vi.mock factories (hoisted above imports) can close over it.
const harness = vi.hoisted(() => {
  const state = {
    coOwners: new Map<string, Record<string, unknown>>(),
    removedIds: [] as string[],
  };
  return state;
});

vi.mock("@/app/actions/co-owners", () => ({
  listCoOwnersForPropertyAction: vi.fn(async (propertyId: string) => ({
    ok: true,
    data: [...harness.coOwners.values()].filter((c) => c.propertyId === propertyId),
  })),
  createCoOwner: vi.fn(async (data: Record<string, unknown>) => {
    const id = `COOWN-NEW-${harness.coOwners.size + 1}`;
    const row = { id, ...data };
    harness.coOwners.set(id, row);
    return { ok: true, data: row };
  }),
  updateCoOwner: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const existing = harness.coOwners.get(id);
    if (!existing) return { ok: false, error: "Co-owner not found" };
    const next = { ...existing, ...patch };
    harness.coOwners.set(id, next);
    return { ok: true, data: next };
  }),
  removeCoOwner: vi.fn(async (id: string) => {
    harness.coOwners.delete(id);
    harness.removedIds.push(id);
    return { ok: true, data: undefined };
  }),
}));

vi.mock("@/app/actions/ownership-records", () => ({
  getOwnershipWizardInitialAction: vi.fn(async () => ({
    ok: true,
    data: {
      record: {
        id: "OREC-TEST-0001",
        propertyId: "PROP-TEST-0001",
        // The state QA hit: the ownership record says Sole Ownership, so the wizard
        // marks the Co-owners step "Skipped" — while co-owners exist on the property.
        holdingType: "Sole Ownership",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      coOwners: [...harness.coOwners.values()],
    },
  })),
  createOwnershipRecord: vi.fn(async (data: Record<string, unknown>) => ({
    ok: true,
    data: { id: "OREC-TEST-0001", ...data },
  })),
  updateOwnershipRecord: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
    ok: true,
    data: { id, ...patch },
  })),
  verifyOwnership: vi.fn(async () => ({ ok: true, data: undefined })),
}));

vi.mock("@/app/actions/properties", () => ({
  updateProperty: vi.fn(async () => ({ ok: true, data: undefined })),
}));

// Imported AFTER the mocks so the wizard config binds to the harness actions.
import { ownershipWizardConfig } from "@/components/feature-unlock/pillars/OwnershipUnlock";

const PROPERTY_ID = "PROP-TEST-0001";
const ENTITY_ID = "OREC-TEST-0001";

const existingCoOwners: CoOwner[] = [
  {
    id: "COOWN-0001",
    propertyId: PROPERTY_ID,
    name: "David Chen",
    role: "Primary",
    sharePercent: 60,
    email: "david@example.com",
    phone: "+1 555 0100",
  },
  {
    id: "COOWN-0002",
    propertyId: PROPERTY_ID,
    name: "Lin Wei",
    role: "Primary",
    sharePercent: 40,
    email: "lin@example.com",
    phone: "+1 555 0101",
  },
];

beforeEach(() => {
  harness.coOwners.clear();
  harness.removedIds.length = 0;
  for (const co of existingCoOwners) {
    harness.coOwners.set(co.id, { ...co });
  }
});

describe("Ownership wizard — save with the Co-owners step skipped", () => {
  it("keeps the property's existing co-owners (no data loss)", async () => {
    // 1. Load the wizard exactly as FeatureUnlockWizard does on open.
    const initial = await ownershipWizardConfig.loadInitial({ propertyId: PROPERTY_ID });
    expect(initial.entityId).toBe(ENTITY_ID);

    // Confidence check: the Co-owners step really is skipped for this state —
    // this is the "Skipped" badge QA saw in the wizard rail.
    const coOwnersStep = ownershipWizardConfig.steps.find((s) => s.key === "co-owners");
    // handleSubmitData parses the raw form values through the wizard schema.
    const parsed = ownershipWizardConfig.schema.safeParse(initial.values);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(coOwnersStep?.shouldSkip?.(parsed.data)).toBe(true);

    // 2. Save without touching anything — the user only clicked through and hit Save.
    const result = await ownershipWizardConfig.onSubmitData({
      values: parsed.data,
      propertyId: PROPERTY_ID,
      entityId: ENTITY_ID,
    });
    expect(result.ok).toBe(true);

    // 3. The existing co-owners must survive a save in which their step was skipped.
    expect(harness.removedIds).toEqual([]);
    expect([...harness.coOwners.keys()].sort()).toEqual(["COOWN-0001", "COOWN-0002"]);
  });
});

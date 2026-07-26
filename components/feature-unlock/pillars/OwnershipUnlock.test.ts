/**
 * Regression test for the co-owner data-loss bug
 * (agent-loop/orchestrator/inbox/2026-07-15-coowner-data-loss.md).
 *
 * Bug: saving the Ownership wizard while the Co-owners step is skipped
 * (holdingType === "Sole Ownership" hides the step) deleted every existing
 * co-owner on the property. A skipped step expresses no intent about
 * co-owners, so the save must leave them untouched.
 *
 * These tests call `ownershipWizardConfig.onSubmitData` directly — the exact
 * function the wizard's Save button runs — with every server action mocked,
 * so no database (Neon dev or prod) is ever touched.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// The wizard component lazy-loads its shell through next/dynamic. We never
// render anything in these tests, so replace it with an inert component to
// keep the import graph small and node-safe.
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

// Mock the three server-action modules the wizard submits through. Each mock
// returns the same `{ ok: true, data }` shape the real actions return.
vi.mock("@/app/actions/ownership-records", () => ({
  createOwnershipRecord: vi.fn(async () => ({
    ok: true,
    data: { id: "OWN-TEST-0001" },
  })),
  updateOwnershipRecord: vi.fn(async () => ({
    ok: true,
    data: { id: "OWN-TEST-0001" },
  })),
  verifyOwnership: vi.fn(async () => ({ ok: true, data: undefined })),
  getOwnershipWizardInitialAction: vi.fn(async () => ({
    ok: true,
    data: { record: null, coOwners: [] },
  })),
}));

vi.mock("@/app/actions/properties", () => ({
  updateProperty: vi.fn(async () => ({ ok: true, data: {} })),
}));

vi.mock("@/app/actions/co-owners", () => ({
  createCoOwner: vi.fn(async () => ({ ok: true, data: { id: "COOWN-NEW" } })),
  updateCoOwner: vi.fn(async () => ({ ok: true, data: { id: "COOWN-0001" } })),
  removeCoOwner: vi.fn(async () => ({ ok: true, data: undefined })),
  listCoOwnersForPropertyAction: vi.fn(),
}));

import { ownershipWizardConfig } from "./OwnershipUnlock";
import {
  createCoOwner,
  updateCoOwner,
  removeCoOwner,
  listCoOwnersForPropertyAction,
} from "@/app/actions/co-owners";
import type { CoOwner } from "@/lib/data/types/co-owner";

// The two co-owners QA lost (COOWN-0001/0002), as the list action returns them.
const existingCoOwners: CoOwner[] = [
  {
    id: "COOWN-0001",
    propertyId: "PROP-0001",
    name: "Alice Nguyen",
    role: "Primary",
    sharePercent: 60,
    email: "alice@example.com",
    phone: "",
  },
  {
    id: "COOWN-0002",
    propertyId: "PROP-0001",
    name: "Ben Carter",
    role: "Primary",
    sharePercent: 40,
    email: "ben@example.com",
    phone: "",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listCoOwnersForPropertyAction).mockResolvedValue({
    ok: true,
    data: existingCoOwners,
  });
});

describe("ownershipWizardConfig.onSubmitData — co-owner reconciliation", () => {
  it("leaves existing co-owners untouched when the Co-owners step is skipped (Sole Ownership)", async () => {
    // The Co-owners step is skipped exactly when holdingType is "Sole
    // Ownership" (see the step's shouldSkip). The user re-saves the wizard —
    // for example after editing only the loan step — without ever seeing the
    // co-owners form.
    const result = await ownershipWizardConfig.onSubmitData({
      values: {
        holdingType: "Sole Ownership",
        coOwners: [],
      },
      propertyId: "PROP-0001",
      entityId: "OWN-TEST-0001",
    });

    expect(result.ok).toBe(true);

    // The bug: this save deleted COOWN-0001 and COOWN-0002. A skipped step
    // must not remove, create, or update any co-owner.
    expect(removeCoOwner).not.toHaveBeenCalled();
    expect(createCoOwner).not.toHaveBeenCalled();
    expect(updateCoOwner).not.toHaveBeenCalled();
  });

  it("still removes a co-owner the user explicitly deleted from the form", async () => {
    // Intended deletion must keep working: the user visited the co-owners
    // step and removed Ben (COOWN-0002), leaving Alice with 100%.
    const result = await ownershipWizardConfig.onSubmitData({
      values: {
        holdingType: "Joint Tenancy",
        coOwners: [
          {
            id: "COOWN-0001",
            name: "Alice Nguyen",
            role: "Primary",
            sharePercent: 100,
            email: "alice@example.com",
            phone: "",
          },
        ],
      },
      propertyId: "PROP-0001",
      entityId: "OWN-TEST-0001",
    });

    expect(result.ok).toBe(true);
    expect(updateCoOwner).toHaveBeenCalledWith(
      "COOWN-0001",
      expect.objectContaining({ name: "Alice Nguyen", sharePercent: 100 }),
    );
    expect(removeCoOwner).toHaveBeenCalledTimes(1);
    expect(removeCoOwner).toHaveBeenCalledWith("COOWN-0002");
  });
});

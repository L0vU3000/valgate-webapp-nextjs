/**
 * Acceptance tests for the Sole-Ownership confirmed cleanup feature
 * (agent-loop/orchestrator/inbox/2026-07-15-sole-ownership-confirmed-cleanup.md).
 *
 * Feature: switching a co-owned property to "Sole Ownership" asks the user
 * whether to remove the existing co-owners — "This removes N co-owners:
 * [names]. Remove / Keep" — with Keep as the default. Deletion happens only
 * on an explicit Remove choice; anything else leaves the rows untouched.
 *
 * These tests call `ownershipWizardConfig.onSubmitData` directly — the exact
 * function the wizard's Save button runs — with every server action mocked,
 * so no database (Neon dev or prod) is ever touched. Same harness as the
 * co-owner data-loss regression test (OwnershipUnlock.test.ts).
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

// The saved co-owners on the property being switched to Sole Ownership.
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

describe("ownershipWizardConfig.onSubmitData — Sole-Ownership confirmed cleanup", () => {
  it("keeps every existing co-owner when no explicit Remove choice was made (default Keep)", async () => {
    // Criterion 1 + 3: the confirm defaults to Keep, so a save that carries
    // no explicit choice must not delete anything. This already holds after
    // the data-loss fix — it guards the invariant the feature builds on.
    const result = await ownershipWizardConfig.onSubmitData({
      values: {
        holdingType: "Sole Ownership",
        coOwners: [],
      },
      propertyId: "PROP-0001",
      entityId: "OWN-TEST-0001",
    });

    expect(result.ok).toBe(true);
    expect(removeCoOwner).not.toHaveBeenCalled();
    expect(createCoOwner).not.toHaveBeenCalled();
    expect(updateCoOwner).not.toHaveBeenCalled();
  });

  it("keeps every existing co-owner when the user explicitly chose Keep", async () => {
    // Criterion 1: an explicit Keep behaves like the default — no deletion.
    const result = await ownershipWizardConfig.onSubmitData({
      values: {
        holdingType: "Sole Ownership",
        coOwners: [],
        removeCoOwnersOnSoleSwitch: false,
      },
      propertyId: "PROP-0001",
      entityId: "OWN-TEST-0001",
    });

    expect(result.ok).toBe(true);
    expect(removeCoOwner).not.toHaveBeenCalled();
  });

  it("removes exactly the existing co-owners when the user explicitly chose Remove", async () => {
    // Criterion 2: only the explicit Remove choice deletes, and it deletes
    // precisely the saved rows — nothing more.
    const result = await ownershipWizardConfig.onSubmitData({
      values: {
        holdingType: "Sole Ownership",
        coOwners: [],
        removeCoOwnersOnSoleSwitch: true,
      },
      propertyId: "PROP-0001",
      entityId: "OWN-TEST-0001",
    });

    expect(result.ok).toBe(true);
    expect(removeCoOwner).toHaveBeenCalledTimes(2);
    expect(removeCoOwner).toHaveBeenCalledWith("COOWN-0001");
    expect(removeCoOwner).toHaveBeenCalledWith("COOWN-0002");
    // Remove is not an edit of the co-owner list — nothing gets created or updated.
    expect(createCoOwner).not.toHaveBeenCalled();
    expect(updateCoOwner).not.toHaveBeenCalled();
  });

  it("never deletes co-owners on a Remove flag when the holding type is NOT Sole Ownership", async () => {
    // Guard: the cleanup flag is meaningless outside the sole-ownership
    // switch. A visible co-owners step keeps the normal diff-and-reconcile.
    const result = await ownershipWizardConfig.onSubmitData({
      values: {
        holdingType: "Joint Tenancy",
        coOwners: [
          {
            id: "COOWN-0001",
            name: "Alice Nguyen",
            role: "Primary",
            sharePercent: 60,
            email: "alice@example.com",
            phone: "",
          },
          {
            id: "COOWN-0002",
            name: "Ben Carter",
            role: "Primary",
            sharePercent: 40,
            email: "ben@example.com",
            phone: "",
          },
        ],
        removeCoOwnersOnSoleSwitch: true,
      },
      propertyId: "PROP-0001",
      entityId: "OWN-TEST-0001",
    });

    expect(result.ok).toBe(true);
    // Both rows are still in the form, so the reconcile updates them and
    // deletes nothing — the stray flag must not override user intent.
    expect(removeCoOwner).not.toHaveBeenCalled();
    expect(updateCoOwner).toHaveBeenCalledTimes(2);
  });
});

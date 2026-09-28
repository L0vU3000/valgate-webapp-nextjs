// The address/coords guard in submitPropertyAction.
//
// Why this exists: mapWizardToProperty falls back to the Cambodia centroid when form.mapCenter is
// unset, and lib/services requires lat/lng — so a property with no picked location used to be
// created silently at a country-centre guess (wrong province, no warning). The action now refuses
// it. This test fails if that guard is removed.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FormData as WizardForm } from "@/app/_shared/add-property/types";
import { defaultForm } from "@/app/_shared/add-property/types";

const createProperty = vi.fn();
vi.mock("@/app/actions/properties", () => ({ createProperty: (...a: unknown[]) => createProperty(...a) }));
vi.mock("@/app/actions/property-drafts", () => ({ convertDraftToDocumentsAction: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const { submitPropertyAction } = await import("@/app/(shell)/add-property/actions");

const valid: WizardForm = {
  ...defaultForm,
  method: "manual",
  propertyType: "residential",
  propertyName: "Riverside Villa",
  addressLine: "12 Sisowath Quay",
  city: "Phnom Penh",
  country: "Cambodia",
};

describe("submitPropertyAction address/coords guard", () => {
  beforeEach(() => createProperty.mockReset().mockResolvedValue({ ok: true, data: { id: "PROP-0001", code: "KPC1" } }));

  it("refuses a form with no mapCenter instead of creating it at the Cambodia centroid", async () => {
    const res = await submitPropertyAction({ ...valid, mapCenter: undefined });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/suggestions/i);
    expect(createProperty).not.toHaveBeenCalled();
  });

  it("proceeds when mapCenter is set", async () => {
    const res = await submitPropertyAction({ ...valid, mapCenter: [104.9282, 11.5564] });
    expect(res.ok).toBe(true);
    expect(createProperty).toHaveBeenCalledTimes(1);
  });

  it("passes the picked centre through as lat/lng (not the centroid fallback)", async () => {
    await submitPropertyAction({ ...valid, mapCenter: [104.9282, 11.5564] });
    const input = createProperty.mock.calls[0][0];
    expect([input.lng, input.lat]).toEqual([104.9282, 11.5564]);
  });
});

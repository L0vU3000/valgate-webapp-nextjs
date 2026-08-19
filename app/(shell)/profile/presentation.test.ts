import { describe, expect, it } from "vitest";
import { buildProfilePresentation } from "./presentation";

const BASE_INPUT = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "555-0100",
  language: "en-US",
  timezone: "Asia/Phnom_Penh",
  currency: "USD",
};

describe("buildProfilePresentation", () => {
  it("only surfaces personal-owner fields — no Job Title, Employee ID, or Office Location", () => {
    const result = buildProfilePresentation(BASE_INPUT);
    const allLabels = [...result.personalInfo, ...result.contactFields, ...result.preferences].map(
      (f) => f.label,
    );

    expect(allLabels).not.toContain("Job Title");
    expect(allLabels).not.toContain("Employee ID");
    expect(allLabels).not.toContain("Office Location");
  });

  it("returns exactly First Name and Last Name as personal info", () => {
    const result = buildProfilePresentation(BASE_INPUT);
    expect(result.personalInfo).toEqual([
      { label: "First Name", value: "Jane" },
      { label: "Last Name", value: "Doe" },
    ]);
  });

  it("returns exactly Email Address and Phone Number as contact fields", () => {
    const result = buildProfilePresentation(BASE_INPUT);
    expect(result.contactFields).toEqual([
      { label: "Email Address", value: "jane@example.com", iconKey: "Mail" },
      { label: "Phone Number", value: "555-0100", iconKey: "Phone" },
    ]);
  });

  it("falls back to an em dash for missing optional fields", () => {
    const result = buildProfilePresentation({ firstName: "", lastName: "", email: "", phone: null });
    expect(result.personalInfo).toEqual([
      { label: "First Name", value: "—" },
      { label: "Last Name", value: "—" },
    ]);
    expect(result.contactFields[1]).toEqual({ label: "Phone Number", value: "—", iconKey: "Phone" });
  });

  it("gives a generic security note with no invented date or compliance claim", () => {
    const result = buildProfilePresentation(BASE_INPUT);
    expect(result.securityNote).not.toMatch(/\d{4}/); // no year/date
    expect(result.securityNote.toLowerCase()).not.toContain("jan 15");
    expect(result.securityNote.length).toBeGreaterThan(0);
  });
});

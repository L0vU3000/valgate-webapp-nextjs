import { describe, expect, it } from "vitest";
import { getAddMoreDetailsHref } from "./cta-destination";

describe("getAddMoreDetailsHref", () => {
  it("returns the property overview path for a confirmed code", () => {
    expect(getAddMoreDetailsHref("PROP-2001")).toBe("/property/PROP-2001/overview");
  });

  it("returns /portfolio when the code is missing", () => {
    expect(getAddMoreDetailsHref(undefined)).toBe("/portfolio");
    expect(getAddMoreDetailsHref(null)).toBe("/portfolio");
    expect(getAddMoreDetailsHref("")).toBe("/portfolio");
  });
});

import { describe, it, expect } from "vitest";
import {
  clerkRoleForPortfolioRole,
  buildPropertyFromStub,
  type PortfolioRole,
} from "./portfolio-shared";

describe("clerkRoleForPortfolioRole", () => {
  it("maps admin to org:admin", () => {
    expect(clerkRoleForPortfolioRole("admin")).toBe("org:admin");
  });

  it("maps member to org:member", () => {
    expect(clerkRoleForPortfolioRole("member")).toBe("org:member");
  });

  it("maps viewer to org:viewer", () => {
    expect(clerkRoleForPortfolioRole("viewer")).toBe("org:viewer");
  });

  it("returns org:viewer for any unrecognised role (fallback branch)", () => {
    const unknown = "unknown" as PortfolioRole;
    expect(clerkRoleForPortfolioRole(unknown)).toBe("org:viewer");
  });
});

describe("buildPropertyFromStub", () => {
  it("builds a residential property with all fields mapped correctly", () => {
    const result = buildPropertyFromStub({
      name: "Villa Riverside",
      type: "residential",
      value: 500000,
    });

    expect(result).toMatchObject({
      name: "Villa Riverside",
      type: "residential",
      status: "Vacant",
      lat: 0,
      lng: 0,
      totalArea: "",
      title: "—",
      buyNumeric: 500000,
      currentMarketValue: 500000,
    });
  });

  it("builds a commercial property with the given value", () => {
    const result = buildPropertyFromStub({
      name: "Downtown Office",
      type: "commercial",
      value: 250000,
    });

    expect(result.type).toBe("commercial");
    expect(result.buyNumeric).toBe(250000);
    expect(result.currentMarketValue).toBe(250000);
  });

  it("builds a land property with the given value", () => {
    const result = buildPropertyFromStub({
      name: "Plot C",
      type: "land",
      value: 80000,
    });

    expect(result.type).toBe("land");
    expect(result.buyNumeric).toBe(80000);
  });

  it("maps an unknown type to other", () => {
    const result = buildPropertyFromStub({
      name: "Mystery Asset",
      type: "warehouse",
    });

    expect(result.type).toBe("other");
  });

  it("trims and lowercases the type before matching", () => {
    const result = buildPropertyFromStub({
      name: "X",
      type: "  Residential  ",
    });

    expect(result.type).toBe("residential");
  });

  it("defaults buyNumeric to 0 when value is undefined", () => {
    const result = buildPropertyFromStub({
      name: "Y",
      type: "land",
    });

    expect(result.buyNumeric).toBe(0);
  });

  it("passes undefined as currentMarketValue when value is not provided", () => {
    const result = buildPropertyFromStub({
      name: "Z",
      type: "commercial",
    });

    expect(result.currentMarketValue).toBeUndefined();
  });

  it("always sets status to Vacant, lat/lng to 0, totalArea to empty, title to dash", () => {
    const result = buildPropertyFromStub({
      name: "Defaults Check",
      type: "residential",
      value: 100,
    });

    expect(result.status).toBe("Vacant");
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
    expect(result.totalArea).toBe("");
    expect(result.title).toBe("—");
  });
});

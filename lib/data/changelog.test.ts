import { describe, it, expect } from "vitest";
import { compareVersions, getLatestChangelogVersion, CHANGELOG } from "./changelog";

describe("compareVersions", () => {
  it("orders by major, minor, then patch", () => {
    expect(compareVersions("1.0.3", "1.0.2")).toBeGreaterThan(0);
    expect(compareVersions("1.0.2", "1.0.3")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("treats missing or malformed parts as 0 without throwing", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.1", "1.0")).toBeGreaterThan(0);
    expect(compareVersions("", "0.0.0")).toBe(0);
    expect(compareVersions("x.y.z", "0.0.0")).toBe(0);
  });
});

describe("getLatestChangelogVersion", () => {
  it("returns the first release's version", () => {
    expect(getLatestChangelogVersion()).toBe(CHANGELOG[0]?.version);
  });

  it("changelog is ordered newest-first", () => {
    for (let i = 0; i < CHANGELOG.length - 1; i += 1) {
      expect(compareVersions(CHANGELOG[i].version, CHANGELOG[i + 1].version)).toBeGreaterThan(0);
    }
  });
});

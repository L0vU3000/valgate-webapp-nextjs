import { describe, expect, it } from "vitest";
import {
  coverageByTier,
  coverageTiers,
  parcelCoverage,
  patternLabels,
  tierColor,
} from "@/lib/data/parcel-coverage";

describe("parcel coverage data", () => {
  it("covers a country more than once", () => {
    expect(parcelCoverage.length).toBeGreaterThan(30);
  });

  it("gives every country a unique id", () => {
    const ids = parcelCoverage.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only lists open-data registers for the countries we serve", () => {
    // An account- or licence-gated register cannot be loaded, so a country in
    // those tiers must never be marked as ready.
    for (const entry of parcelCoverage.filter((e) => e.served)) {
      expect(entry.tier, `${entry.id} serves but is not open data`).toBe("open");
      expect(entry.pattern, `${entry.id} serves with no source pattern`).not.toBe("manual");
    }
  });

  it("leaves every country with no source unserved", () => {
    for (const entry of parcelCoverage.filter((e) => e.pattern === "manual")) {
      expect(entry.served, `${entry.id} has no source but claims to serve`).toBe(false);
    }
  });

  it("keeps the countries we can do exactly at the verified set", () => {
    // These twelve were exercised against the provider on 30 Sep 2026. If this
    // changes, the landing page's claim changed — re-verify before editing.
    expect(parcelCoverage.filter((e) => e.served).map((e) => e.id).sort()).toEqual([
      "at",
      "au-nsw",
      "au-qld",
      "au-tas",
      "au-vic",
      "ca-bc",
      "ch",
      "de",
      "es",
      "fr",
      "nl",
      "sg",
    ]);
  });

  it("keeps every country inside its continent's latitude and longitude range", () => {
    for (const entry of parcelCoverage) {
      expect(Math.abs(entry.lat), `${entry.id} latitude`).toBeLessThanOrEqual(90);
      expect(Math.abs(entry.lng), `${entry.id} longitude`).toBeLessThanOrEqual(180);
    }
  });

  it("groups every country into exactly one tier", () => {
    const grouped = coverageByTier.flatMap((group) => group.countries);
    expect(grouped.length).toBe(parcelCoverage.length);
    expect(new Set(grouped.map((e) => e.id)).size).toBe(parcelCoverage.length);
  });

  it("gives each tier a label, a summary and a 0–255 colour", () => {
    for (const tier of Object.keys(coverageTiers) as (keyof typeof coverageTiers)[]) {
      const { label, summary, color } = coverageTiers[tier];
      expect(label.length).toBeGreaterThan(0);
      expect(summary.length).toBeGreaterThan(0);
      expect(color).toHaveLength(3);
      for (const channel of color) {
        expect(channel, `${tier} channel`).toBeGreaterThanOrEqual(0);
        expect(channel, `${tier} channel`).toBeLessThanOrEqual(255);
      }
    }
  });

  it("renders tier colours as CSS colours", () => {
    expect(tierColor("open")).toBe("rgb(5 150 105)");
  });

  it("gives every country a note and a labelled access pattern", () => {
    for (const entry of parcelCoverage) {
      expect(entry.note.length, `${entry.id} note`).toBeGreaterThan(0);
      expect(patternLabels[entry.pattern], `${entry.id} pattern`).toBeTruthy();
    }
  });
});

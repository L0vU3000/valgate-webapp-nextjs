import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateWireFixtures, wireFixturesDirectory } from "../scripts/export-api-v1-wire-fixtures";

describe("committed API v1 wire fixtures", () => {
  const fixtures = generateWireFixtures();

  it("contains exactly the generated JSON files (including optional-heavy variants)", () => {
    expect(readdirSync(wireFixturesDirectory).filter((name) => name.endsWith(".json")).sort())
      .toEqual(Object.keys(fixtures));
  });

  for (const [name, generated] of Object.entries(fixtures)) {
    it(`${name} matches the real mapper output; re-export intentional changes with npm run wire:export`, () => {
      const committed = readFileSync(resolve(wireFixturesDirectory, name), "utf8");
      // Compare HTTP JSON, not the mapper's JS object: undefined fields are omitted.
      expect(JSON.parse(generated)).toStrictEqual(JSON.parse(committed));
      expect(generated).toBe(committed);
    });
  }

  it("is byte-stable regardless of the wall clock and restores Date.now", () => {
    const originalNow = Date.now;
    try {
      Date.now = () => 0;
      expect(generateWireFixtures()).toStrictEqual(fixtures);
      expect(Date.now()).toBe(0);
      Date.now = () => 4_000_000_000_000;
      expect(generateWireFixtures()).toStrictEqual(fixtures);
      expect(Date.now()).toBe(4_000_000_000_000);
    } finally {
      Date.now = originalNow;
    }
  });
});

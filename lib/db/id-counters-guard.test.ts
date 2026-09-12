import { describe, it, expect } from "vitest";
import {
  parsePrefixedId,
  rememberMaxSuffix,
  nextCounterValue,
  findIdCounterDrift,
  assertIdCountersAheadOfSuffixes,
} from "./id-counters-guard";

// TM1-74: the seed used to write id_counters with onConflictDoNothing, which
// froze PROP.next at 13 after fixtures grew to 25 rows. nextId() then returned
// PROP-0013 and inserts died on properties_pkey. These tests pin the rule:
// counter.next must be greater than the max existing suffix.

describe("parsePrefixedId", () => {
  it("reads a zero-padded nextId value", () => {
    expect(parsePrefixedId("PROP-0025")).toEqual({ prefix: "PROP", suffix: 25 });
  });

  it("reads a multi-letter prefix", () => {
    expect(parsePrefixedId("UPROF-0001")).toEqual({ prefix: "UPROF", suffix: 1 });
  });

  it("ignores demo fixture ids that have no numeric suffix", () => {
    expect(parsePrefixedId("demo-user")).toBeNull();
  });

  it("ignores UUID ids so the activities table cannot pollute counters", () => {
    expect(parsePrefixedId("550e8400-e29b-41d4-a716-446655440000")).toBeNull();
  });

  it("ignores an empty string", () => {
    expect(parsePrefixedId("")).toBeNull();
  });
});

describe("rememberMaxSuffix", () => {
  it("keeps the highest suffix per prefix and skips junk ids", () => {
    const maxByPrefix = new Map<string, number>();

    rememberMaxSuffix(maxByPrefix, "PROP-0013");
    rememberMaxSuffix(maxByPrefix, "PROP-0025");
    rememberMaxSuffix(maxByPrefix, "PROP-0002");
    rememberMaxSuffix(maxByPrefix, "TEN-0004");
    rememberMaxSuffix(maxByPrefix, "demo-user");

    expect(maxByPrefix.get("PROP")).toBe(25);
    expect(maxByPrefix.get("TEN")).toBe(4);
    expect(maxByPrefix.has("demo")).toBe(false);
  });
});

describe("nextCounterValue", () => {
  it("stores one past the highest suffix so nextId() is free", () => {
    expect(nextCounterValue(25)).toBe(26);
    expect(nextCounterValue(0)).toBe(1);
  });
});

describe("findIdCounterDrift", () => {
  it("flags the original PROP next=13 vs 25-row fixture bug", () => {
    const maxByPrefix = new Map<string, number>([["PROP", 25], ["TEN", 4]]);
    const counters = new Map<string, number>([["PROP", 13], ["TEN", 5]]);

    const drifts = findIdCounterDrift(maxByPrefix, counters);

    expect(drifts).toHaveLength(1);
    expect(drifts[0]?.prefix).toBe("PROP");
    expect(drifts[0]?.counterNext).toBe(13);
    expect(drifts[0]?.maxSuffix).toBe(25);
    expect(drifts[0]?.message).toContain("would collide");
  });

  it("flags next equal to the max suffix, because nextId() would reuse that id", () => {
    const maxByPrefix = new Map<string, number>([["PROP", 25]]);
    const counters = new Map<string, number>([["PROP", 25]]);

    const drifts = findIdCounterDrift(maxByPrefix, counters);

    expect(drifts).toHaveLength(1);
    expect(drifts[0]?.counterNext).toBe(25);
  });

  it("flags a missing counter when rows already exist", () => {
    const maxByPrefix = new Map<string, number>([["PROP", 25]]);
    const counters = new Map<string, number>();

    const drifts = findIdCounterDrift(maxByPrefix, counters);

    expect(drifts).toHaveLength(1);
    expect(drifts[0]?.counterNext).toBeNull();
    expect(drifts[0]?.message).toContain("no id_counters row");
  });

  it("passes when every counter is strictly ahead of existing suffixes", () => {
    const maxByPrefix = new Map<string, number>([["PROP", 25], ["TEN", 4]]);
    const counters = new Map<string, number>([["PROP", 26], ["TEN", 5]]);

    expect(findIdCounterDrift(maxByPrefix, counters)).toEqual([]);
  });
});

describe("assertIdCountersAheadOfSuffixes", () => {
  it("throws the seed-time error when a counter would collide", () => {
    const maxByPrefix = new Map<string, number>([["PROP", 25]]);
    const counters = new Map<string, number>([["PROP", 13]]);

    expect(() => {
      assertIdCountersAheadOfSuffixes(maxByPrefix, counters);
    }).toThrow(/greatest\(current, new\)/);
  });

  it("does not throw when counters are safely ahead", () => {
    const maxByPrefix = new Map<string, number>([["PROP", 25]]);
    const counters = new Map<string, number>([["PROP", 26]]);

    expect(() => {
      assertIdCountersAheadOfSuffixes(maxByPrefix, counters);
    }).not.toThrow();
  });
});

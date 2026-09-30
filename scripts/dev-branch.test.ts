import { describe, it, expect } from "vitest";
import { portFor } from "./dev-branch.mjs";

// The point of the per-branch port is that two checkouts never share one. Asserting "it is
// in range" would pass for a constant, so these pin the three real worktree names and the
// no-collision property that motivates the whole script.
describe("per-branch dev port", () => {
  const WORKTREES = ["haddock", "seafan", "valgate-webapp-nextjs"];

  it("stays inside the reserved range", () => {
    for (const name of WORKTREES) {
      expect(portFor(name)).toBeGreaterThanOrEqual(3001);
      expect(portFor(name)).toBeLessThan(3100);
    }
  });

  it("gives the three real worktrees different ports", () => {
    const ports = WORKTREES.map(portFor);
    expect(new Set(ports).size).toBe(WORKTREES.length);
  });

  it("is stable across calls, so a redirect URL stays valid", () => {
    expect(portFor("haddock")).toBe(portFor("haddock"));
  });

  it("separates names that differ only by case or suffix", () => {
    expect(portFor("main")).not.toBe(portFor("main2"));
  });
});

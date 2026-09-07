import { describe, it, expect, vi, afterEach } from "vitest";
import { actionLimiter, aiLimiter, allowed, makeLimiter, type Limiter } from "@/lib/ratelimit";

// TM1-64. These exercise the IN-MEMORY limiter, which is what makeLimiter returns when
// UPSTASH_* is unset (the case in test/CI). That is the branch worth pinning here: the
// Upstash path is vendor code, the fallback is ours.
//
// Every test uses a unique user id — the in-memory limiter keeps module-level state, so
// sharing an id across tests would leak budget between them.
let n = 0;
const uid = (label: string) => `USR-${label}-${n++}`;

afterEach(() => vi.useRealTimers());

describe("actionLimiter (30/min)", () => {
  it("allows 30 calls in a minute and rejects the 31st", async () => {
    const id = uid("action");
    for (let i = 1; i <= 30; i++) {
      expect(await allowed(actionLimiter, id, "test"), `call ${i} should pass`).toBe(true);
    }
    expect(await allowed(actionLimiter, id, "test")).toBe(false);
  });

  it("counts per user, so one caller cannot exhaust another's budget", async () => {
    const a = uid("a");
    const b = uid("b");
    for (let i = 0; i < 30; i++) await allowed(actionLimiter, a, "test");
    expect(await allowed(actionLimiter, a, "test")).toBe(false);
    expect(await allowed(actionLimiter, b, "test")).toBe(true);
  });
});

describe("aiLimiter (10/min)", () => {
  it("is tighter than actionLimiter: rejects the 11th call", async () => {
    const id = uid("ai");
    for (let i = 1; i <= 10; i++) {
      expect(await allowed(aiLimiter, id, "test"), `call ${i} should pass`).toBe(true);
    }
    expect(await allowed(aiLimiter, id, "test")).toBe(false);
  });

  it("keeps a separate bucket from actionLimiter for the same user", async () => {
    const id = uid("split");
    for (let i = 0; i < 10; i++) await allowed(aiLimiter, id, "test");
    expect(await allowed(aiLimiter, id, "test")).toBe(false);
    // Exhausting the AI budget must not lock the user out of ordinary mutations.
    expect(await allowed(actionLimiter, id, "test")).toBe(true);
  });
});

describe("sliding window", () => {
  it("lets the caller through again once the window has passed", async () => {
    vi.useFakeTimers();
    const limiter = makeLimiter("rl:test-window", 2, "1 m", 60_000);
    const id = uid("window");
    expect(await allowed(limiter, id, "test")).toBe(true);
    expect(await allowed(limiter, id, "test")).toBe(true);
    expect(await allowed(limiter, id, "test")).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(await allowed(limiter, id, "test")).toBe(true);
  });
});

describe("allowed() fails closed", () => {
  it("blocks rather than opens when the limiter throws", async () => {
    // An Upstash/network outage must not become an open door on every gated edge.
    const broken: Limiter = { limit: async () => { throw new Error("redis down"); } };
    expect(await allowed(broken, uid("broken"), "test")).toBe(false);
  });
});

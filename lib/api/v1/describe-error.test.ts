import { describe, it, expect } from "vitest";
import { describeError } from "./describe-error";

// The bug this guards: a drizzle failure logged as String(err) produced only the
// statement text, so a schema error looked like an unexplained 500. These cases
// pin the cause-unwrapping that makes the reason reach the log.
describe("describeError", () => {
  it("includes the nested cause that String(err) would drop", () => {
    const pg = new Error('column "cover_storage_id" of relation "properties" does not exist');
    const drizzle = new Error(
      'Failed query: insert into "properties" ("id", "org_id") values ($1, $2)',
    );
    (drizzle as Error & { cause?: unknown }).cause = pg;

    const out = describeError(drizzle);

    expect(out).toContain("Failed query");
    expect(out).toContain("does not exist");
    // The whole point: the reason survives.
    expect(out).not.toEqual(String(drizzle));
  });

  it("surfaces postgres.js detail/code hung on the error itself", () => {
    const err = Object.assign(new Error("Failed query: insert into \"properties\""), {
      code: "23503",
      detail: 'Key (org_id)=(ORG-0004) is not present in table "organizations".',
    });

    const out = describeError(err);

    expect(out).toContain("23503");
    expect(out).toContain("ORG-0004");
  });

  it("stays finite on a self-referential cause chain", () => {
    const a: Error & { cause?: unknown } = new Error("outer");
    const b: Error & { cause?: unknown } = new Error("inner");
    a.cause = b;
    b.cause = a; // cycle

    const out = describeError(a);

    expect(out).toContain("outer");
    expect(out).toContain("inner");
  });

  it("falls back to String() for non-Error throws", () => {
    expect(describeError("plain string failure")).toBe("plain string failure");
  });

  it("keeps a simple error's message intact", () => {
    expect(describeError(new Error("invalid_cursor"))).toBe("invalid_cursor");
  });
});

import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "./cursor";

// ---------------------------------------------------------------------------
// Pure, framework-free cursor encode/decode used by the read-only HTTP API v1
// list endpoints (see lib/services/properties.ts#listPropertiesPage). No DB,
// no network, no Clerk — just the opaque-cursor contract itself.
// ---------------------------------------------------------------------------

type FixtureCursor = { createdAt: number; id: string };

describe("encodeCursor / decodeCursor", () => {
  it("round-trips the same fields it was given", () => {
    const fields: FixtureCursor = { createdAt: 1700000000000, id: "PROP-0042" };
    const cursor = encodeCursor(fields);
    expect(decodeCursor<FixtureCursor>(cursor)).toEqual(fields);
  });

  it("produces an opaque token (not the raw JSON) so callers cannot read or guess it", () => {
    const fields: FixtureCursor = { createdAt: 1700000000000, id: "PROP-0042" };
    const cursor = encodeCursor(fields);
    expect(cursor).not.toContain("PROP-0042");
    expect(cursor).not.toContain("createdAt");
  });

  it("is stable: encoding the same fields twice yields the same cursor", () => {
    const fields: FixtureCursor = { createdAt: 1700000000000, id: "PROP-0042" };
    expect(encodeCursor(fields)).toBe(encodeCursor({ ...fields }));
  });

  it("returns null for a garbage/tampered cursor instead of throwing", () => {
    expect(decodeCursor("not-a-real-cursor")).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("returns null for a cursor that decodes to valid base64 but the wrong shape", () => {
    const wrongShape = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    expect(decodeCursor<FixtureCursor>(wrongShape, ["createdAt", "id"])).toBeNull();
  });

  it("distinguishes different fields with different cursors", () => {
    const a = encodeCursor<FixtureCursor>({ createdAt: 1, id: "PROP-0001" });
    const b = encodeCursor<FixtureCursor>({ createdAt: 2, id: "PROP-0002" });
    expect(a).not.toBe(b);
  });
});

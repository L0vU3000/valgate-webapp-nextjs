import { describe, it, expect } from "vitest";
import { isClientAllowed, parseClientAllowlist } from "./clientAllowlist";

// ---------------------------------------------------------------------------
// M1 audience-binding decision. These lock down the exact rule /mcp uses to
// accept or reject an OAuth token based on its client id. The "reject → 401"
// wiring in app/mcp/route.ts is already proven live (an invalid token returns
// 401 via the same `return undefined` path); this suite proves the *logic*
// that feeds it, across every branch, without env / network / DB.
// ---------------------------------------------------------------------------

describe("parseClientAllowlist", () => {
  it("treats unset / empty input as an empty list (allowlist not configured)", () => {
    expect(parseClientAllowlist(undefined)).toEqual([]);
    expect(parseClientAllowlist("")).toEqual([]);
    expect(parseClientAllowlist("   ")).toEqual([]);
  });

  it("splits on commas and trims surrounding whitespace", () => {
    expect(parseClientAllowlist("abc")).toEqual(["abc"]);
    expect(parseClientAllowlist("abc,def")).toEqual(["abc", "def"]);
    expect(parseClientAllowlist(" abc , def ,ghi")).toEqual(["abc", "def", "ghi"]);
  });

  it("drops empty entries from stray or trailing commas", () => {
    expect(parseClientAllowlist("abc,,def,")).toEqual(["abc", "def"]);
    expect(parseClientAllowlist(",abc,")).toEqual(["abc"]);
  });
});

describe("isClientAllowed", () => {
  it("allows any client when the allowlist is empty (DCR / not configured)", () => {
    expect(isClientAllowed("client_anything", [])).toBe(true);
    // Even a missing client id is allowed when nothing is configured — the route
    // still requires a *valid* token upstream, so this branch never runs unbound.
    expect(isClientAllowed(undefined, [])).toBe(true);
  });

  it("allows a client id that is on a configured allowlist", () => {
    expect(isClientAllowed("client_chatgpt", ["client_chatgpt"])).toBe(true);
    expect(isClientAllowed("client_b", ["client_a", "client_b"])).toBe(true);
  });

  it("rejects a valid client id that is NOT on the allowlist (the M1 case)", () => {
    expect(isClientAllowed("client_evil", ["client_chatgpt"])).toBe(false);
    expect(isClientAllowed("client_c", ["client_a", "client_b"])).toBe(false);
  });

  it("rejects a missing client id when an allowlist is configured", () => {
    expect(isClientAllowed(undefined, ["client_chatgpt"])).toBe(false);
  });

  it("is exact-match (no partial or case-insensitive matching)", () => {
    expect(isClientAllowed("client_chat", ["client_chatgpt"])).toBe(false);
    expect(isClientAllowed("CLIENT_CHATGPT", ["client_chatgpt"])).toBe(false);
  });
});

describe("parse + decide together (end-to-end of the pure path)", () => {
  it("unset env string → any client allowed", () => {
    const allowlist = parseClientAllowlist(undefined);
    expect(isClientAllowed("client_from_dcr", allowlist)).toBe(true);
  });

  it("configured env string → only the listed client is allowed", () => {
    const allowlist = parseClientAllowlist(" client_a , client_b ");
    expect(isClientAllowed("client_a", allowlist)).toBe(true);
    expect(isClientAllowed("client_b", allowlist)).toBe(true);
    expect(isClientAllowed("client_x", allowlist)).toBe(false);
  });
});

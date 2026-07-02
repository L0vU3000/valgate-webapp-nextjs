// M1 — the OAuth client allowlist decision, as two small PURE functions.
//
// Why this lives on its own (not inline in app/mcp/route.ts): the route reads env and Clerk auth,
// which makes it awkward to unit-test. The actual security decision — "is this client id allowed?"
// — is pure string logic, so we isolate it here where it can be tested exhaustively with no env,
// no network, and no database. The route just wires env + the token's clientId into these.
//
// Recap of the "why" (see route.ts for the full note): Clerk OAuth tokens are bound to the Clerk
// *instance*, not to this /mcp resource, so verification alone does not prove a token was meant for
// us. Binding to specific client ids is how we make "audience" real for Clerk's model.

// Turn the raw env string (e.g. "abc, def ,ghi") into a clean list of client ids.
// Empty / unset input yields an empty list, which callers treat as "allowlist not configured".
export function parseClientAllowlist(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((clientId) => clientId.trim())
    .filter((clientId) => clientId.length > 0);
}

// Decide whether a token's OAuth client id may use /mcp.
//   - Empty allowlist  → NOT configured → allow any client. This is required for Dynamic Client
//     Registration (DCR), where clients like Claude mint a fresh client id we can't know ahead of
//     time. The route logs a warning in this case so an unbound endpoint is never silent.
//   - Non-empty allowlist → only the listed client ids are allowed; everything else is rejected
//     (including a missing/undefined client id, which should never happen for a valid OAuth token).
export function isClientAllowed(clientId: string | undefined, allowlist: string[]): boolean {
  if (allowlist.length === 0) {
    return true;
  }
  if (clientId === undefined) {
    return false;
  }
  return allowlist.includes(clientId);
}

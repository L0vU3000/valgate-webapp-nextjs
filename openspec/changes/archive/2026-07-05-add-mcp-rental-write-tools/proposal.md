## Why

The Valgate MCP server lets an AI assistant read a whole portfolio but only *write* to two entities — properties and maintenance. Everything that makes a rental portfolio actually move — leases, tenants, rent payments — is read-only, so the assistant can answer "who owes rent?" but cannot "record June's rent for unit 4" or "add the new tenant to the lease." Closing that gap turns the connector from a reporting tool into an assistant that does the work. The service layer for these entities already exists and is battle-tested by the website, so the write tools are thin wrappers, not new business logic.

## What Changes

- Add outcome-shaped **MCP write tools** for the rental-income core, each a thin wrapper over the existing `lib/services/*` functions and Zod schemas:
  - **Leases**: `create_lease`, `update_lease`, `delete_lease`
  - **Tenants**: `create_tenant`, `update_tenant`, `delete_tenant`
  - **Payments**: `record_payment` (create), `update_payment`, `delete_payment`
- Every new tool follows the **exact design laws already in `mcp-server/writes.ts`**: reuse the website's Zod schemas, never re-implement authorization (the service layer enforces org-scope + role + demo read-only), audit every mutation via `logActivity`, and resolve org explicitly with `requireExplicitOrg` so a multi-org caller must name the workspace.
- Destructive deletes (`delete_lease`, `delete_tenant`, `delete_payment`) are gated behind the **same two-step confirm + blast-radius preview** pattern `delete_property` uses, where the entity has cascading children.
- Register the new tools alongside the existing seven via `registerWriteTools` in `mcp-server/register.ts`, keeping the two transports (stdio demo + authenticated HTTP) identical.
- **Documents write tools are explicitly deferred** to a follow-up: `create_document` needs file storage/upload handling (S3 presigned flow) that the other entities don't, so it doesn't fit the thin-wrapper shape and would expand scope. Reads of documents already work via the property resource.

Non-goals: no changes to reads (the `valgate://property/{id}` resource already nests leases/tenants/payments), no new services, no schema/migration changes, no auth changes.

## Capabilities

### New Capabilities
- `mcp-rental-write-tools`: MCP write tools for leases, tenants, and payments — create/update/delete over the connector, each a thin, audited, org-scoped, role-enforced wrapper over the existing services, with destructive deletes behind a confirm + preview gate.

### Modified Capabilities
<!-- None — there are no existing specs; this is the first spec in the repo, and no prior requirement changes. -->

## Impact

- **New code**: write-tool registrations in `mcp-server/` (extend `writes.ts` or a sibling module; wire into `register.ts`). Mirrors the existing `create_property`/`delete_property` shape.
- **Reused, unchanged**: `lib/services/{leases,tenants,payments}.ts` (already expose `create*/update*/delete*`), their Zod schemas in `lib/data/types/{lease,tenant,payment}.ts`, `logActivity`, and the `resolveWriteCtx` + `orgIdArg` helpers in `writes.ts`.
- **Surface area**: the connector's tool list grows from 7 to ~16 tools. Worth watching the tool-count budget; if it gets noisy, a later change can move some reads to resources (the existing design law) — out of scope here.
- **No impact** on the website, the database schema, authorization, or the OAuth/transport layers.
- **Verification bar**: `tsc --noEmit` + `npm run lint` clean, and each new tool live-tested through the connector against a throwaway record (create → update → delete), exactly how the existing 7 were verified.

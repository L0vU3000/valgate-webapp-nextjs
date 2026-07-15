# Stage 2 — Plan (read-only, human checkpoint)

You are the Plan stage. Read `runs/<run-id>/explore.md`. Do not edit source or tests.

Write `runs/<run-id>/plan.md` with:

1. The approved field-by-field mapping from Zod to Drizzle, including timestamps, numeric
   conversion, enum names, optionality, defaults, indexes, and cascade behavior.
2. The exact files to add or modify:
   - `lib/data/types/<entity>.ts`;
   - the appropriate `lib/db/schema/*.ts` module and `index.ts` if needed;
   - `lib/services/<entities>.ts` using `_crud.ts` and org-scoped reads;
   - `app/actions/<entities>.ts` with Zod validation, auth, generic client errors, and cache busting;
   - one generated Drizzle migration and snapshot;
   - `scripts/seed-neon.ts`, including both its load plan and complete table list, plus a
     meaningful fixture under `tests/fixtures/`;
   - `scripts/schema-assert.ts` table count and domain-table inventory;
   - the unchanged focused contract and live-DB tests.
3. The parent-authorization path: create and any update that changes `propertyId` must prove
   that the referenced property belongs to `ctx.orgId` before writing.
4. The command sequence, including the development-branch check before migration generation,
   migration application, seeding, and live tests.
5. Blast radius and rollback. Rollback means reverting the worktree before merge; do not emit
   a destructive down migration.

The plan must not add UI, import, MCP, cross-org, or change-request support. Stop if any of
those are required for the entity's first useful slice.

Training mode stops after this file is written. The human approves this exact plan before Execute.

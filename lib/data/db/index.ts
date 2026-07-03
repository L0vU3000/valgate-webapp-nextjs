import "server-only";

// M3 (backend migration): the simulated data layer was deleted for the ~28 backend-covered
// domains. clients moved to Drizzle (lib/services/client-records.ts) in the Phase 4
// dual-write retirement. Only agent-runs and dbdiagram-state stay FS-backed (ephemeral
// by design — /tmp on Vercel). See docs/migration/00-PLAN.md.
export * as agentRuns from "./agent-runs";
export * as dbdiagramState from "./dbdiagram-state";

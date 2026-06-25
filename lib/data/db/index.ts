import "server-only";

// M3 (backend migration): the simulated data layer was deleted for the ~28 backend-covered
// domains. Only the three deferred gap-domains stay simulated (no backend until B11) and keep
// their barrel exports. See docs/migration/00-PLAN.md.
export * as clients from "./clients";
export * as agentRuns from "./agent-runs";
export * as dbdiagramState from "./dbdiagram-state";

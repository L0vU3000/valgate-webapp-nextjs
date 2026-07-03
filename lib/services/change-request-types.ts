// Shared change-request domain type (Pro-3.0 — generalized ops).
// Lives in its own module so lib/services/change-requests.ts (CRUD + approval flow)
// and lib/services/_change-request-dispatcher.ts (entity registry + apply) can both
// use it without importing each other — this file exists to break that import cycle.

export type ChangeRequest = {
  id: string;
  ownerOrgId: string;
  managerUserId: string;
  entityType: string;
  // Null for "create" operations — the entity doesn't exist yet.
  entityId: string | null;
  operation: "create" | "update" | "delete";
  proposedPatch: Record<string, unknown>;
  status: "pending" | "approved" | "denied";
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

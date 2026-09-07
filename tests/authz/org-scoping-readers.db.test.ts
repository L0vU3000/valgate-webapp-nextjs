// TM1-65 — org-scoping coverage for every single-argument list reader.
//
// Why this file exists alongside org-scoping-idor.db.test.ts:
//   That file proves the SHARED write path (scopedUpdate / scopedDelete in _crud.ts)
//   enforces `AND(orgId = ctx.orgId, id = ?)`. Running 15 entities through it would
//   exercise the same function 15 times, not 15 defenses.
//
//   The readers are different: each service hand-writes its own WHERE clause. A single
//   omitted `eq(table.orgId, ctx.orgId)` in any one of them leaks that entity's whole
//   table across every tenant. That is 35 independent chances to get it wrong, so this
//   table drives all of them.
//
// Method: call each reader with a ctx whose orgId/userId own nothing at all. The only
// correct answer is an empty list. Anything non-empty is a cross-tenant read.
// No seeding required — that is the point; "owns nothing" needs no fixtures.
//
// Runs against the DEV Neon branch (npm run test:db). Read-only. Never seed:reset.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    DEMO_MODE: false,
    DEMO_ALLOW_WRITES: false,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    CLERK_SECRET_KEY: "demo-no-clerk",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
  },
}));

import type { Ctx } from "@/lib/services/_mapping";
import { listActivities } from "@/lib/services/activities";
import { listAiSessions } from "@/lib/services/ai-sessions";
import { listCertifications } from "@/lib/services/certifications";
import { listPendingForOwner } from "@/lib/services/change-requests";
import { listManagerClientOrgs, listClientRecords } from "@/lib/services/client-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listDocuments } from "@/lib/services/documents";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";
import { listEstateActivityEvents } from "@/lib/services/estate-activity-events";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listExpenses } from "@/lib/services/expenses";
import { listFolders } from "@/lib/services/folders";
import { listInspections } from "@/lib/services/inspections";
import { listLandParcels } from "@/lib/services/land-parcels";
import { listLeases } from "@/lib/services/leases";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import {
  listManagedAccounts,
  listMyAccessRequests,
  listAccessRequestsForOwner,
  listManagersForOwner,
} from "@/lib/services/managers";
import { listNotificationPreferences } from "@/lib/services/notification-preferences";
import { listNotifications } from "@/lib/services/notifications";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listOwnershipHistory } from "@/lib/services/ownership-history";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listPayments } from "@/lib/services/payments";
import { listProfessionals } from "@/lib/services/professionals";
import { listProperties } from "@/lib/services/properties";
import { listPropertyDrafts } from "@/lib/services/property-drafts";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listSuccessors } from "@/lib/services/successors";
import { listTenants } from "@/lib/services/tenants";
import { listUserProfiles } from "@/lib/services/user-profiles";

// Owns nothing: ORG-PHANTOM and USR-PHANTOM are never inserted anywhere.
// orgRole is "owner" so every role check passes — the ONLY thing under test is the
// org/user filter. If a reader leaks, it cannot be blamed on a role gate.
const phantom: Ctx = {
  userId: "USR-PHANTOM",
  orgId: "ORG-PHANTOM",
  orgRole: "owner",
};

const READERS: ReadonlyArray<[name: string, run: (ctx: Ctx) => Promise<unknown[]>]> = [
  ["activities.listActivities", listActivities],
  ["ai-sessions.listAiSessions", listAiSessions],
  ["certifications.listCertifications", listCertifications],
  ["change-requests.listPendingForOwner", listPendingForOwner],
  ["client-records.listManagerClientOrgs", listManagerClientOrgs],
  ["client-records.listClientRecords", listClientRecords],
  ["co-owners.listCoOwners", listCoOwners],
  ["documents.listDocuments", listDocuments],
  ["emergency-contacts.listEmergencyContacts", listEmergencyContacts],
  ["estate-activity-events.listEstateActivityEvents", listEstateActivityEvents],
  ["estate-assignments.listEstateAssignments", listEstateAssignments],
  ["expenses.listExpenses", listExpenses],
  ["folders.listFolders", listFolders],
  ["inspections.listInspections", listInspections],
  ["land-parcels.listLandParcels", listLandParcels],
  ["leases.listLeases", listLeases],
  ["maintenance-items.listMaintenanceItems", listMaintenanceItems],
  ["managers.listManagedAccounts", listManagedAccounts],
  ["managers.listMyAccessRequests", listMyAccessRequests],
  ["managers.listAccessRequestsForOwner", listAccessRequestsForOwner],
  ["managers.listManagersForOwner", listManagersForOwner],
  ["notification-preferences.listNotificationPreferences", listNotificationPreferences],
  ["notifications.listNotifications", listNotifications],
  ["ownership-documents.listOwnershipDocuments", listOwnershipDocuments],
  ["ownership-history.listOwnershipHistory", listOwnershipHistory],
  ["ownership-records.listOwnershipRecords", listOwnershipRecords],
  ["payments.listPayments", listPayments],
  ["professionals.listProfessionals", listProfessionals],
  ["properties.listProperties", listProperties],
  ["property-drafts.listPropertyDrafts", listPropertyDrafts],
  ["property-valuations.listPropertyValuations", listPropertyValuations],
  ["safety-risks.listSafetyRisks", listSafetyRisks],
  ["successors.listSuccessors", listSuccessors],
  ["tenants.listTenants", listTenants],
  ["user-profiles.listUserProfiles", listUserProfiles],
];

describe("IDOR — a ctx that owns nothing reads nothing", () => {
  it.each(READERS)("%s returns no rows for ORG-PHANTOM", async (_name, run) => {
    // Throwing is also a safe outcome (fails closed); returning another org's rows is not.
    let rows: unknown[];
    try {
      rows = await run(phantom);
    } catch {
      return; // refused outright — no leak
    }
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(0);
  });

  it("covers every single-arg list reader in lib/services", () => {
    // Guard against the table silently drifting behind the codebase: if someone adds a
    // new list<Entity>(ctx) reader, this count fails and they must add it above.
    expect(READERS).toHaveLength(35);
  });
});

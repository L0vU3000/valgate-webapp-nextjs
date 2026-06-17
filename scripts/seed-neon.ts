// B2 seed pipeline — loads the demo portfolio into Neon under one demo org (C3/D14),
// Zod-parsing every record against the vendored contract (drift = fail loud, C9).
// Run: npm run seed:reset   (truncate + load)   |   npm run seed   (load only)
import "server-only";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getTableColumns, getTableName, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { ZodTypeAny } from "zod";
import { assertSafeDatabaseUrl } from "@/lib/db/assert-safe-database-url";
import { convertRowToDb } from "@/lib/db/column-classifier";
import { db } from "@/lib/db/client";
import * as s from "@/lib/db/schema";

import { PropertySchema } from "@/lib/data/types/property";
import { TenantSchema } from "@/lib/data/types/tenant";
import { LeaseSchema } from "@/lib/data/types/lease";
import { PaymentSchema } from "@/lib/data/types/payment";
import { FolderSchema } from "@/lib/data/types/folder";
import { DocumentSchema } from "@/lib/data/types/document";
import { InspectionSchema } from "@/lib/data/types/inspection";
import { CertificationSchema } from "@/lib/data/types/certification";
import { SafetyRiskSchema } from "@/lib/data/types/safety-risk";
import { EmergencyContactSchema } from "@/lib/data/types/emergency-contact";
import { MaintenanceItemSchema } from "@/lib/data/types/maintenance-item";
import { PropertyValuationSchema } from "@/lib/data/types/property-valuation";
import { OwnershipRecordSchema } from "@/lib/data/types/ownership-record";
import { OwnershipDocumentSchema } from "@/lib/data/types/ownership-document";
import { OwnershipHistorySchema } from "@/lib/data/types/ownership-history";
import { SuccessorSchema } from "@/lib/data/types/successor";
import { EstateAssignmentSchema } from "@/lib/data/types/successor-property-assignment";
import { ProfessionalSchema } from "@/lib/data/types/professional";
import { UserProfileSchema } from "@/lib/data/types/user-profile";
import { NotificationSchema } from "@/lib/data/types/notification";
import { NotificationPreferenceSchema } from "@/lib/data/types/notification-preference";
import { ExpenseSchema } from "@/lib/data/types/expense";
import { CoOwnerSchema } from "@/lib/data/types/co-owner";
import { LandParcelSchema } from "@/lib/data/types/land-parcel";
import { EstateActivityEventSchema } from "@/lib/data/types/estate-activity-event";
import { AiSessionSchema } from "@/lib/data/types/ai-session";
import { AiMessageSchema } from "@/lib/data/types/ai-message";

const ORG = "ORG-0001";
const USER = "USR-0001";
const FIXTURES = join(process.cwd(), "tests", "fixtures");

type Entry = { dir: string; table: PgTable; schema: ZodTypeAny; files?: string[]; selfFk?: string };

// FK-safe order (parents before children). properties merge their 4 split files.
const PLAN: Entry[] = [
  { dir: "properties", table: s.properties, schema: PropertySchema, files: ["core.json", "finance.json", "location.json", "media.json"] },
  { dir: "land-parcels", table: s.landParcels, schema: LandParcelSchema },
  { dir: "co-owners", table: s.coOwners, schema: CoOwnerSchema },
  { dir: "tenants", table: s.tenants, schema: TenantSchema },
  { dir: "leases", table: s.leases, schema: LeaseSchema },
  { dir: "payments", table: s.payments, schema: PaymentSchema },
  { dir: "expenses", table: s.expenses, schema: ExpenseSchema },
  { dir: "folders", table: s.folders, schema: FolderSchema, selfFk: "parentFolderId" },
  { dir: "documents", table: s.documents, schema: DocumentSchema },
  { dir: "inspections", table: s.inspections, schema: InspectionSchema },
  { dir: "certifications", table: s.certifications, schema: CertificationSchema },
  { dir: "safety-risks", table: s.safetyRisks, schema: SafetyRiskSchema },
  { dir: "emergency-contacts", table: s.emergencyContacts, schema: EmergencyContactSchema },
  { dir: "maintenance-items", table: s.maintenanceItems, schema: MaintenanceItemSchema },
  { dir: "property-valuations", table: s.propertyValuations, schema: PropertyValuationSchema },
  { dir: "ownership-records", table: s.ownershipRecords, schema: OwnershipRecordSchema },
  { dir: "ownership-documents", table: s.ownershipDocuments, schema: OwnershipDocumentSchema },
  { dir: "ownership-history", table: s.ownershipHistory, schema: OwnershipHistorySchema },
  { dir: "successors", table: s.successors, schema: SuccessorSchema },
  { dir: "estate-activity-events", table: s.estateActivityEvents, schema: EstateActivityEventSchema },
  { dir: "estate-assignments", table: s.successorPropertyAssignments, schema: EstateAssignmentSchema },
  { dir: "professionals", table: s.professionals, schema: ProfessionalSchema },
  { dir: "user-profiles", table: s.userProfiles, schema: UserProfileSchema },
  { dir: "notifications", table: s.notifications, schema: NotificationSchema },
  { dir: "notification-preferences", table: s.notificationPreferences, schema: NotificationPreferenceSchema },
  { dir: "ai-sessions", table: s.aiSessions, schema: AiSessionSchema },
  { dir: "ai-messages", table: s.aiMessages, schema: AiMessageSchema },
];

const ALL_TABLES = [
  s.organizations, s.users, s.organizationMemberships, s.idCounters,
  s.properties, s.landParcels, s.propertyValuations, s.tenants, s.leases, s.payments, s.expenses,
  s.folders, s.documents, s.inspections, s.certifications, s.safetyRisks, s.emergencyContacts,
  s.maintenanceItems, s.coOwners, s.ownershipRecords, s.ownershipDocuments, s.ownershipHistory,
  s.successors, s.successorPropertyAssignments, s.estateActivityEvents, s.professionals,
  s.userProfiles, s.notifications, s.notificationPreferences,
  s.pillarVerifications, s.verificationEvidence, s.verificationEvents,
  s.aiSessions, s.aiMessages,
];

// Read every record dir for an entity, merging the listed files into one object.
function readEntity(e: Entry): Record<string, unknown>[] {
  const base = join(FIXTURES, e.dir);
  if (!existsSync(base)) return [];
  const files = e.files ?? ["core.json"];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      let obj: Record<string, unknown> = {};
      for (const f of files) {
        const p = join(base, d.name, f);
        if (existsSync(p)) obj = { ...obj, ...JSON.parse(readFileSync(p, "utf8")) };
      }
      return obj;
    });
}

// Generic transform via shared classifier, then stamp org_id + user_id (created-by).
function toRow(table: PgTable, parsed: Record<string, unknown>): Record<string, unknown> {
  const row = convertRowToDb(table, parsed);
  const cols = getTableColumns(table);
  if ("orgId" in cols) row.orgId = ORG;
  if ("userId" in cols) row.userId = USER;
  return row;
}

// folders carry a self-FK — insert roots first, then children whose parent is loaded.
function orderBySelfFk(rows: Record<string, unknown>[], fk: string): Record<string, unknown>[] {
  const done = new Set<string>();
  const out: Record<string, unknown>[] = [];
  const pending = [...rows];
  while (pending.length) {
    const ready = pending.filter((r) => !r[fk] || done.has(r[fk] as string));
    if (!ready.length) throw new Error(`cycle/missing parent in ${fk}`);
    for (const r of ready) { out.push(r); done.add(r.id as string); }
    pending.splice(0, pending.length, ...pending.filter((r) => !done.has(r.id as string)));
  }
  return out;
}

function bumpCounter(counters: Map<string, number>, id: string) {
  const m = /^(.*)-(\d+)$/.exec(id);
  if (!m) return;
  const prefix = m[1]!;
  counters.set(prefix, Math.max(counters.get(prefix) ?? 0, Number(m[2])));
}

async function reset() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("seed:reset: DATABASE_URL missing");
  assertSafeDatabaseUrl(url, "seed:reset (TRUNCATE … CASCADE)");
  const names = ALL_TABLES.map((t) => `"${getTableName(t)}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`));
  console.log("reset: truncated all tables");
}

async function main() {
  const doReset = process.argv.includes("--reset");
  if (doReset) await reset();

  // Trio (D14)
  await db.insert(s.organizations).values({ id: ORG, clerkOrgId: "demo-org", name: "Demo Workspace", slug: "demo" }).onConflictDoNothing();
  await db.insert(s.users).values({ id: USER, clerkUserId: "demo-user", primaryEmail: "demo@valgate.app", displayName: "Demo User" }).onConflictDoNothing();
  await db.insert(s.organizationMemberships).values({ id: "MEM-0001", orgId: ORG, userId: USER, role: "owner", status: "active" }).onConflictDoNothing();

  const counters = new Map<string, number>([["ORG", 1], ["USR", 1], ["MEM", 1], ["VRF", 0], ["VEV", 0], ["VHE", 0]]);
  const report: { table: string; loaded: number; expected: number }[] = [];
  const leaseProp = new Map<string, string>();   // leaseId → propertyId (backfill payments)
  let failed = false;

  for (const e of PLAN) {
    const records = readEntity(e);
    let rows = records.map((rec) => {
      const parsed = e.schema.parse(rec) as Record<string, unknown>;
      if (e.dir === "leases") leaseProp.set(parsed.id as string, parsed.propertyId as string);
      if (e.dir === "payments" && parsed.leaseId) parsed.propertyId = leaseProp.get(parsed.leaseId as string);
      return toRow(e.table, parsed);
    });
    if (e.selfFk) rows = orderBySelfFk(rows, e.selfFk as string);
    rows.forEach((r) => bumpCounter(counters, r.id as string));

    await db.transaction(async (tx) => {
      if (rows.length) await tx.insert(e.table).values(rows).onConflictDoNothing();
    });

    const n = await db.$count(e.table);
    report.push({ table: getTableName(e.table), loaded: n, expected: records.length });
    if (n !== records.length) failed = true;
  }

  // id_counters: next = max seen suffix + 1 (so nextId never collides with seeded ids)
  const counterRows = [...counters].map(([collection, max]) => ({ collection, next: max + 1 }));
  await db.insert(s.idCounters).values(counterRows).onConflictDoNothing();

  console.table(report);
  console.log(`id_counters: ${counterRows.length} prefixes seeded`);
  if (failed) { console.error("FAILED: a table's row count != fixture count"); process.exit(1); }
  console.log("seed OK");
  process.exit(0);
}

void main();

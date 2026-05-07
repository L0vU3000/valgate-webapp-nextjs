import { rm } from "node:fs/promises";
import path from "node:path";
import { DEMO_USER_ID } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import * as fixtures from "./fixtures";

const userId = DEMO_USER_ID;
const args = new Set(process.argv.slice(2));

async function main() {
  if (args.has("--reset")) {
    const userDir = path.join(process.cwd(), "public", "data", "users", userId);
    await rm(userDir, { recursive: true, force: true });
    console.log(`✓ wiped ${userDir}`);
  }

  // Order matters — entities later in the list reference earlier ones.
  await seedAll("properties", fixtures.properties, db.properties);
  await seedAll("ownership-documents", fixtures.ownership, db.ownershipDocuments);
  await seedAll("ownership-history", fixtures.ownershipHistory, db.ownershipHistory);
  await seedAll("tenants", fixtures.tenants, db.tenants);
  await seedAll("leases", fixtures.leases, db.leases);
  await seedAll("payments", fixtures.payments, db.payments);
  await seedAll("folders", fixtures.folders, db.folders);
  await seedAll("documents", fixtures.documents, db.documents);
  await seedAll("inspections", fixtures.inspections, db.inspections);
  await seedAll("certifications", fixtures.certifications, db.certifications);
  await seedAll("emergency-contacts", fixtures.emergencyContacts, db.emergencyContacts);
  await seedAll("safety-risks", fixtures.safetyRisks, db.safetyRisks);
  await seedAll("property-valuations", fixtures.valuations, db.propertyValuations);
  await seedAll("notifications", fixtures.notifications, db.notifications);
  await seedAll("successors", fixtures.successors, db.successors);
  await seedAll("professionals", fixtures.professionals, db.professionals);
  await seedAll("maintenance-items", fixtures.maintenance, db.maintenanceItems);
  await seedAll("notification-preferences", fixtures.notificationPreferences, db.notificationPreferences);

  await db.userProfiles.upsert(userId, fixtures.userProfile);
  console.log(`✓ user-profiles: 1 record`);

  console.log("✓ seed complete");
}

async function seedAll<T>(
  label: string,
  records: T[],
  collection: { create: (uid: string, data: T) => Promise<unknown> },
): Promise<void> {
  for (const r of records) await collection.create(userId, r);
  console.log(`✓ ${label}: ${records.length} record${records.length === 1 ? "" : "s"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { DEMO_USER_ID } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { NewClient } from "@/lib/data/db/clients";

// Pro-interface seed evolution.
//
// Adds the multi-owner overlay on top of the existing committed seed data:
//   1. Creates 6 owner-clients (the manager's book of business).
//   2. Tags every existing property with a clientId.
//   3. Flips 8 long-vacant properties to Rented, with real leases,
//      tenants, and two months of payment history (May + June 2026),
//      so collection-rate / occupancy / alert derivations have
//      meaningful values to work with.
//   4. Assigns vendors (Professionals) to three open work orders.
//
// Deliberately additive: it never deletes or regenerates existing
// records, because the committed JSON under public/data/ is the
// project's source of truth (scripts/fixtures has drifted from it
// and `seed:reset` would destroy evolved data).
//
// Idempotent: refuses to run if any clients already exist.
//
// Dates are pinned (not Date.now()) so the generated JSON is stable.

const userId = DEMO_USER_ID;

const day = 24 * 60 * 60 * 1000;
// Anchor "today" for seeded history: June 2026.
const JUNE = Date.UTC(2026, 5, 1); // 2026-06-01

async function main() {
  const existingClients = await db.clients.list(userId);
  if (existingClients.length > 0) {
    console.log("✗ clients already seeded — aborting (idempotency guard)");
    process.exit(1);
  }

  // ---------------------------------------------------------------
  // 1. Clients (the manager's book of business)
  // ---------------------------------------------------------------

  const clientDefs: NewClient[] = [
    {
      userId,
      name: "Vireak Family Office",
      clientType: "Corporate",
      initials: "VF",
      avatarBg: "bg-violet-400",
      email: "office@vireakfamily.com.kh",
      phone: "+855 23 900 145",
      preferredContact: "Email",
      clientSince: Date.UTC(2022, 2, 15), // Mar 2022
      managementFeePct: 8,
      createdAt: Date.UTC(2022, 2, 15),
      updatedAt: JUNE,
    },
    {
      userId,
      name: "Mey Lina",
      clientType: "Individual",
      initials: "ML",
      avatarBg: "bg-rose-400",
      email: "mey.lina@gmail.com",
      phone: "+855 12 334 901",
      preferredContact: "Phone",
      clientSince: Date.UTC(2023, 6, 3), // Jul 2023
      managementFeePct: 10,
      createdAt: Date.UTC(2023, 6, 3),
      updatedAt: JUNE,
    },
    {
      userId,
      name: "Tan Holdings Co.",
      clientType: "Corporate",
      initials: "TH",
      avatarBg: "bg-sky-400",
      email: "admin@tanholdings.com.kh",
      phone: "+855 23 215 778",
      preferredContact: "Email",
      clientSince: Date.UTC(2021, 10, 22), // Nov 2021
      managementFeePct: 7.5,
      createdAt: Date.UTC(2021, 10, 22),
      updatedAt: JUNE,
    },
    {
      userId,
      name: "Sok Chanthou",
      clientType: "Individual",
      initials: "SC",
      avatarBg: "bg-amber-400",
      email: "sokchanthou@outlook.com",
      phone: "+855 17 556 210",
      preferredContact: "Phone",
      clientSince: Date.UTC(2024, 1, 9), // Feb 2024
      managementFeePct: 10,
      createdAt: Date.UTC(2024, 1, 9),
      updatedAt: JUNE,
    },
    {
      userId,
      name: "Harper & Liem Estates",
      clientType: "Corporate",
      initials: "HL",
      avatarBg: "bg-emerald-400",
      email: "portfolio@harperliem.com",
      phone: "+855 23 882 460",
      preferredContact: "Email",
      clientSince: Date.UTC(2022, 8, 1), // Sep 2022
      managementFeePct: 8.5,
      createdAt: Date.UTC(2022, 8, 1),
      updatedAt: JUNE,
    },
    {
      userId,
      name: "Rina Pich",
      clientType: "Individual",
      initials: "RP",
      avatarBg: "bg-cyan-400",
      email: "rina.pich@gmail.com",
      phone: "+855 96 778 034",
      preferredContact: "Email",
      clientSince: Date.UTC(2025, 3, 18), // Apr 2025
      managementFeePct: 10,
      createdAt: Date.UTC(2025, 3, 18),
      updatedAt: JUNE,
    },
  ];

  const clients = [];
  for (const def of clientDefs) {
    const created = await db.clients.create(userId, def);
    clients.push(created);
    console.log(`✓ client ${created.id} — ${created.name}`);
  }

  const [vireak, meyLina, tanHoldings, sokChanthou, harperLiem, rinaPich] =
    clients;

  // ---------------------------------------------------------------
  // 2. Partition the existing 23 properties across the 6 clients
  // ---------------------------------------------------------------

  const partition: Array<[string, string]> = [
    // Vireak Family Office — high-value residential & land
    ["PROP-0011", vireak.id],
    ["PROP-0012", vireak.id],
    ["PROP-0017", vireak.id],
    ["PROP-0020", vireak.id],
    // Mey Lina — the multi-unit block PROP-0002..0005
    ["PROP-0002", meyLina.id],
    ["PROP-0003", meyLina.id],
    ["PROP-0004", meyLina.id],
    ["PROP-0005", meyLina.id],
    // Tan Holdings — commercial
    ["PROP-0001", tanHoldings.id],
    ["PROP-0010", tanHoldings.id],
    ["PROP-0013", tanHoldings.id],
    // Sok Chanthou — multi-units PROP-0006..0009
    ["PROP-0006", sokChanthou.id],
    ["PROP-0007", sokChanthou.id],
    ["PROP-0008", sokChanthou.id],
    ["PROP-0009", sokChanthou.id],
    // Harper & Liem — mixed commercial/land/retail
    ["PROP-0014", harperLiem.id],
    ["PROP-0015", harperLiem.id],
    ["PROP-0016", harperLiem.id],
    ["PROP-0021", harperLiem.id],
    // Rina Pich — small residential incl. two disposals (Sold)
    ["PROP-0018", rinaPich.id],
    ["PROP-0019", rinaPich.id],
    ["PROP-0022", rinaPich.id],
    ["PROP-0023", rinaPich.id],
  ];

  for (const [propertyId, clientId] of partition) {
    const updated = await db.properties.update(userId, propertyId, {
      clientId,
    });
    if (!updated) throw new Error(`Property not found: ${propertyId}`);
  }
  console.log(`✓ tagged ${partition.length} properties with clientId`);

  // ---------------------------------------------------------------
  // 3. New rentals: flip 8 vacant properties to Rented and create
  //    tenant + lease + May/June 2026 payments for each.
  // ---------------------------------------------------------------

  type RentalDef = {
    propertyId: string;
    tenantName: string;
    unit: string;
    monthlyRent: number;
    leaseStart: number;
    leaseEnd: number;
    termMonths: number;
    renewalStatus?: string;
    method: "ABA Bank" | "Wing" | "Wire transfer" | "Cash";
    // Status of the June 2026 rent payment — drives the tenant status
    // and the overdue/pending alert derivations.
    juneStatus: "Paid" | "Pending" | "Overdue";
    email?: string;
    phone?: string;
  };

  const rentals: RentalDef[] = [
    {
      propertyId: "PROP-0002",
      tenantName: "Keo Sokunthea",
      unit: "Unit 2A",
      monthlyRent: 400,
      leaseStart: JUNE - 290 * day,
      leaseEnd: JUNE + 75 * day, // inside the 90-day expiry window
      termMonths: 12,
      renewalStatus: "Pending decision",
      method: "ABA Bank",
      juneStatus: "Paid",
      email: "keo.sokunthea@gmail.com",
      phone: "+855 12 778 451",
    },
    {
      propertyId: "PROP-0003",
      tenantName: "Marcus Webb",
      unit: "Unit 3B",
      monthlyRent: 350,
      leaseStart: JUNE - 150 * day,
      leaseEnd: JUNE + 215 * day,
      termMonths: 12,
      renewalStatus: "Auto-renew",
      method: "Wing",
      juneStatus: "Paid",
      email: "marcus.webb@protonmail.com",
      phone: "+855 96 240 118",
    },
    {
      propertyId: "PROP-0005",
      tenantName: "Phan Vandara",
      unit: "Unit 5C",
      monthlyRent: 450,
      leaseStart: JUNE - 200 * day,
      leaseEnd: JUNE + 165 * day,
      termMonths: 12,
      method: "Cash",
      juneStatus: "Pending",
      phone: "+855 17 902 663",
    },
    {
      propertyId: "PROP-0007",
      tenantName: "Lim Sreyneang",
      unit: "Unit 1B",
      monthlyRent: 300,
      leaseStart: JUNE - 110 * day,
      leaseEnd: JUNE + 255 * day,
      termMonths: 12,
      renewalStatus: "Auto-renew",
      method: "Wing",
      juneStatus: "Paid",
      phone: "+855 11 384 270",
    },
    {
      propertyId: "PROP-0008",
      tenantName: "Davuth Chea",
      unit: "Unit 2C",
      monthlyRent: 420,
      leaseStart: JUNE - 341 * day,
      leaseEnd: JUNE + 24 * day, // expiring within 30 days → urgent alert
      termMonths: 12,
      renewalStatus: "Pending decision",
      method: "ABA Bank",
      juneStatus: "Paid",
      email: "davuth.chea@yahoo.com",
      phone: "+855 92 661 905",
    },
    {
      propertyId: "PROP-0017",
      tenantName: "Élodie Martin",
      unit: "Whole villa",
      monthlyRent: 4500,
      leaseStart: JUNE - 80 * day,
      leaseEnd: JUNE + 285 * day,
      termMonths: 12,
      method: "Wire transfer",
      juneStatus: "Overdue", // large overdue → top triage item
      email: "elodie.martin@orange.fr",
      phone: "+855 78 445 312",
    },
    {
      propertyId: "PROP-0018",
      tenantName: "Hour Piseth",
      unit: "Whole house",
      monthlyRent: 600,
      leaseStart: JUNE - 230 * day,
      leaseEnd: JUNE + 135 * day,
      termMonths: 12,
      renewalStatus: "Auto-renew",
      method: "ABA Bank",
      juneStatus: "Paid",
      phone: "+855 10 559 884",
    },
    {
      propertyId: "PROP-0021",
      tenantName: "Golden Lotus Trading Co.",
      unit: "Street level",
      monthlyRent: 1500,
      leaseStart: JUNE - 320 * day,
      leaseEnd: JUNE + 410 * day,
      termMonths: 24,
      renewalStatus: "Auto-renew",
      method: "Wire transfer",
      juneStatus: "Paid",
      email: "accounts@goldenlotus.com.kh",
      phone: "+855 23 760 220",
    },
  ];

  for (const r of rentals) {
    // Tenant status mirrors the June rent payment status.
    const tenantStatus = r.juneStatus === "Paid" ? "Paid" : r.juneStatus;

    const tenant = await db.tenants.create(userId, {
      propertyId: r.propertyId,
      name: r.tenantName,
      unit: r.unit,
      rent: r.monthlyRent,
      status: tenantStatus,
      email: r.email,
      phone: r.phone,
    });

    const lease = await db.leases.create(userId, {
      propertyId: r.propertyId,
      tenantId: tenant.id,
      unit: r.unit,
      stage: "Signed",
      startDate: r.leaseStart,
      endDate: r.leaseEnd,
      monthlyRent: r.monthlyRent,
      termMonths: r.termMonths,
      renewalStatus: r.renewalStatus,
    });

    // May 2026 rent — always collected.
    await db.payments.create(userId, {
      leaseId: lease.id,
      date: Date.UTC(2026, 4, 2),
      kind: "Rent",
      amount: r.monthlyRent,
      method: r.method,
      status: "Paid",
    });

    // June 2026 rent — mixed statuses for real triage data.
    await db.payments.create(userId, {
      leaseId: lease.id,
      date: Date.UTC(2026, 5, 3),
      kind: "Rent",
      amount: r.monthlyRent,
      method: r.method,
      status: r.juneStatus,
    });

    await db.properties.update(userId, r.propertyId, { status: "Rented" });
    console.log(
      `✓ rented ${r.propertyId} → ${tenant.id} / ${lease.id} ($${r.monthlyRent}/mo, June ${r.juneStatus})`,
    );
  }

  // ---------------------------------------------------------------
  // 3b. June 2026 payments for the three pre-existing Signed leases
  //     (their committed history stops in April 2026).
  // ---------------------------------------------------------------

  const existingLeasePayments: Array<{
    leaseId: string;
    amount: number;
    method: "ABA Bank" | "Wing" | "Wire transfer" | "Cash";
    statuses: Array<["Paid" | "Pending" | "Overdue", number]>; // [status, date]
  }> = [
    {
      leaseId: "LEASE-0001", // PROP-0001, $850
      amount: 850,
      method: "ABA Bank",
      statuses: [
        ["Paid", Date.UTC(2026, 4, 1)],
        ["Paid", Date.UTC(2026, 5, 2)],
      ],
    },
    {
      leaseId: "LEASE-0002", // PROP-0010, $2,200
      amount: 2200,
      method: "Wing",
      statuses: [
        ["Paid", Date.UTC(2026, 4, 3)],
        ["Overdue", Date.UTC(2026, 5, 5)],
      ],
    },
    {
      leaseId: "LEASE-0004", // PROP-0014, $2,400
      amount: 2400,
      method: "ABA Bank",
      statuses: [
        ["Paid", Date.UTC(2026, 4, 2)],
        ["Paid", Date.UTC(2026, 5, 3)],
      ],
    },
  ];

  for (const p of existingLeasePayments) {
    for (const [status, date] of p.statuses) {
      await db.payments.create(userId, {
        leaseId: p.leaseId,
        date,
        kind: "Rent",
        amount: p.amount,
        method: p.method,
        status,
      });
    }
    console.log(`✓ payments for ${p.leaseId} (May + June 2026)`);
  }

  // ---------------------------------------------------------------
  // 4. Assign vendors to three open work orders
  // ---------------------------------------------------------------

  const vendorAssignments: Array<[string, string]> = [
    ["MAINT-0001", "PROF-0007"], // burst pipe → Chan Piseth (Plumber)
    ["MAINT-0003", "PROF-0002"], // → Chea Sophal (Maintenance)
    ["MAINT-0006", "PROF-0003"], // → Heng Virak (Electrician)
  ];

  for (const [maintId, vendorId] of vendorAssignments) {
    const updated = await db.maintenanceItems.update(userId, maintId, {
      vendorId,
    });
    if (!updated) throw new Error(`Maintenance item not found: ${maintId}`);
    console.log(`✓ assigned ${vendorId} to ${maintId}`);
  }

  console.log("✓ pro seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

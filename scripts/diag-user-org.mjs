// READ-ONLY: does this Clerk user exist in the Valgate DB, and what orgs do they belong to?
//   node scripts/diag-user-org.mjs <email>
import pg from "pg";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);

const email = process.argv[2];
if (!email) { console.error("usage: node scripts/diag-user-org.mjs <email>"); process.exit(2); }

const c = new pg.Client({ connectionString: env.DATABASE_URL });
await c.connect();

const q = async (label, sql, params = []) => {
  const r = await c.query(sql, params);
  console.log(`\n=== ${label} ===`);
  console.table(r.rows);
  return r.rows;
};

// 1. Is there a users row for this email, and what is its Clerk id?
const u = await q("users row for email", `
  select id, clerk_user_id, primary_email, created_at
  from users where lower(primary_email) = lower($1)`, [email]);

// 2. If found, what memberships/orgs?
if (u.length) {
  const uid = u[0].id;
  await q("memberships for that user", `
    select m.id, m.org_id, m.role, o.name as org_name, o.clerk_org_id
    from organization_memberships m
    left join organizations o on o.id = m.org_id
    where m.user_id = $1`, [uid]);

  await q("properties owned by that user", `
    select count(*)::int as cnt from properties where user_id = $1`, [uid]);

  await q("properties in their orgs", `
    select p.org_id, count(*)::int as cnt
    from properties p
    where p.org_id in (select org_id from organization_memberships where user_id = $1)
    group by p.org_id`, [uid]);
} else {
  console.log("\n>> NO users row for this email — the Clerk webhook never provisioned them.");
}

// 3. Global shape, for context.
await q("totals", `
  select
    (select count(*) from users)::int as users,
    (select count(*) from organizations)::int as orgs,
    (select count(*) from organization_memberships)::int as memberships,
    (select count(*) from properties)::int as properties`);

await q("all users (id, email, clerk id)", `
  select id, primary_email, clerk_user_id from users order by id`);

await c.end();

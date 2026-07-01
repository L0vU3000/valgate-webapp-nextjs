import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  const rows = await db.execute("SELECT * FROM clients WHERE name ILIKE '%test%' OR name ILIKE '%resend%' OR email ILIKE '%resend%'");
  console.log("CLIENTS:", JSON.stringify(rows.rows, null, 2));

  const handoffRows = await db.execute("SELECT id, client_name, client_email, org_id, status FROM client_handoffs WHERE client_email ILIKE '%resend%' OR client_name ILIKE '%test%'");
  console.log("HANDOFFS:", JSON.stringify(handoffRows.rows, null, 2));

  const orgRows = await db.execute("SELECT id, name, clerk_org_id FROM organizations WHERE name ILIKE '%test%' OR name ILIKE '%resend%'");
  console.log("ORGS:", JSON.stringify(orgRows.rows, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));

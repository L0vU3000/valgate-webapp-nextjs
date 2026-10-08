// READ-ONLY: is the signed-in user a member of the org that HOLDS the properties?
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);

const sk = env.CLERK_SECRET_KEY;
const api = async (path) => {
  const res = await fetch(`https://api.clerk.com/v1${path}`, { headers: { Authorization: `Bearer ${sk}` } });
  if (!res.ok) return { error: `${res.status}`, body: (await res.text()).slice(0, 300) };
  return res.json();
};

const UID = "user_3HqeYXGc26mePpCBjTgIYBoSnHS";        // 12w83b37@…  = USR-0060
const OLD = "user_3FIjliOqfLlww8RKQkcOSwviLPa";        // 4gm1295v@…  = USR-0018
const ADDY = "org_3FIjlezmExgR3VPxDk23NEA16vt";        // holds 108 properties
const NEW  = "org_3HqeYRRMIxAOv40ZMmAfCY54xkM";        // the user's own new org

for (const [label, uid] of [["new acct 12w83b37@", UID], ["old acct 4gm1295v@", OLD]]) {
  const r = await api(`/users/${uid}/organization_memberships?limit=100`);
  console.log(`\n=== ${label} (${uid}) ===`);
  if (r.error) { console.log("  FAILED:", r.error, r.body); continue; }
  const data = r.data ?? r;
  if (!Array.isArray(data) || !data.length) { console.log("  (no org memberships)"); continue; }
  for (const m of data) {
    const org = m.organization ?? {};
    const tag = org.id === ADDY ? "  <== HOLDS THE 108 PROPERTIES" : "";
    console.log(`  ${org.id}  role=${m.role}  name=${org.name}${tag}`);
  }
}

console.log("\n=== who can see 'addy' (org holding the properties) ===");
const mem = await api(`/organizations/${ADDY}/memberships?limit=100`);
if (mem.error) console.log("  FAILED:", mem.error, mem.body);
else for (const m of (mem.data ?? mem)) {
  console.log(`  user=${m.public_user_data?.user_id}  role=${m.role}  email=${m.public_user_data?.identifier}`);
}

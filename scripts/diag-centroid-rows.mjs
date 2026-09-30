// READ-ONLY: how many properties sit on the fake Cambodia centroid?
import pg from "pg";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n")
  .filter(l=>l && !l.startsWith("#") && l.includes("="))
  .map(l=>{const i=l.indexOf("=");return [l.slice(0,i), l.slice(i+1).replace(/^["']|["']$/g,"")];}));
const c = new pg.Client({connectionString: env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
const q = await c.query(`select count(*)::int n from properties
  where abs(lat-12.5657) < 0.0001 and abs(lng-104.991) < 0.0001`);
const t = await c.query(`select count(*)::int n from properties`);
const byOrg = await c.query(`select org_id, count(*)::int n from properties
  where abs(lat-12.5657) < 0.0001 and abs(lng-104.991) < 0.0001
  group by org_id order by n desc`);
console.log("on centroid :", q.rows[0].n);
console.log("total props :", t.rows[0].n);
console.log("by org      :", JSON.stringify(byOrg.rows));
await c.end();

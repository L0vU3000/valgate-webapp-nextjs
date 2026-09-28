// Real-browser check that the wizard shows GrabMaps suggestions from /api/v1/address/suggest.
import { chromium } from "@playwright/test";
const BASE = process.argv[2] || "http://localhost:3001";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const seen = [];
p.on("response", async (r) => {
  if (r.url().includes("/api/v1/address/suggest")) {
    let n = -1;
    try { n = ((await r.json()).items || []).length; } catch {}
    seen.push(`${r.status()} items=${n}`);
  }
});
await p.goto(`${BASE}/add-property?step=2`, { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForTimeout(2500);
const box = p.locator('input[placeholder*="earch" i], input[placeholder*="ddress" i]').first();
await box.click();
await box.fill("Street 215 Veal Vong Phnom Penh");
await p.waitForTimeout(4000);
const text = await p.evaluate(() => document.body.innerText);
const hasGrab = /Jawaharlal|Veal Vong|7 Makara|St 215/i.test(text);
console.log("API_CALLS:", JSON.stringify(seen));
console.log("SUGGESTION_VISIBLE:", hasGrab);
console.log("SNIPPET:", text.split("\n").filter(l=>/Jawaharlal|Veal|Makara|St 215|No results|Loading/i.test(l)).slice(0,6).join(" | "));
await b.close();

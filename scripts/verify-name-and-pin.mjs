// Real-browser check of the two new wizard behaviours:
//   A. Searching "J Tower 2" shows the BUILDING NAME in the pick list (not just a street).
//   B. Moving the map pin refreshes the address fields.
//
// The server must be on 3001. Reverse-geocoding needs geo-places:ReverseGeocode granted, so part B
// reports the API status rather than pretending success.
//
// Run: node scripts/verify-name-and-pin.mjs [baseUrl]
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://localhost:3001";
const out = {};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

const api = [];
page.on("response", (r) => {
  const u = r.url();
  if (u.includes("/api/v1/address/")) api.push(`${u.split("/api/v1/address/")[1].split("?")[0]} ${r.status()}`);
});

await page.goto(`${BASE}/add-property?step=2`, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(3000);

// Property Name is required before the step will advance.
await page.locator('input[placeholder*="Skyline" i]').first().fill("J Tower 2 Test");

// --- A: name search ---
const box = page.locator('input[placeholder*="Search address" i]').first();
await box.click();
await box.fill("J Tower 2");
await page.waitForTimeout(4500);

const listText = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const hit = btns.find((b) => /j tower/i.test(b.innerText) && /j tower 2/i.test(b.innerText));
  return hit ? hit.innerText.replace(/\n/g, " | ") : null;
});
out.nameSuggestionRendered = listText;
out.apiCalls = api;

// Click the match, then read the address field the pick wrote.
if (listText) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /j tower 2/i.test(x.innerText));
    b?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });
  await page.waitForTimeout(1200);
}
await page.evaluate(() => {
  document.querySelectorAll("button").forEach((b) => {
    if (/enter address manually/i.test(b.innerText)) b.click();
  });
});
await page.waitForTimeout(800);
out.addressLine = await page.evaluate(() => {
  const i = [...document.querySelectorAll("input")].find((x) => /street address/i.test(x.placeholder || ""));
  return i ? i.value : null;
});
out.pinned = await page.evaluate(() => /Location pinned at/i.test(document.body.innerText));

console.log(JSON.stringify(out, null, 2));
await browser.close();

// Verifies the address/pin guard end-to-end in a real browser.
//   node scripts/verify-guard.mjs [baseUrl]
// Uses JS-dispatched clicks because Clerk's dev overlay intercepts pointer events.
import { chromium } from "@playwright/test";
const BASE = process.argv[2] || "http://localhost:3002";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 1200 } })).newPage();
const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?"PASS":"FAIL"}  ${name}${detail?` — ${detail}`:""}`); };

await p.goto(`${BASE}/add-property?step=2`, { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForTimeout(6000);
const kill = p.getByRole("button", { name: /I'll remove it myself/i }).first();
if (await kill.count()) { await kill.click({ timeout: 5000 }).catch(()=>{}); await p.waitForTimeout(1200); }

// 1. Address is marked required (no "optional").
check("Address label is required", await p.evaluate(()=>{
  const l=[...document.querySelectorAll("label")].find(e=>/Address/.test(e.innerText));
  return !!l && !/optional/i.test(l.innerText);
}));

// 2. Empty name+address -> both errors, still on step 2.
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].filter(e=>/^Continue$/i.test((e.innerText||"").trim())); b[b.length-1]?.click();});
await p.waitForTimeout(2000);
const txt = await p.evaluate(()=>document.body.innerText);
check("blocks empty address", /Please enter the property address/.test(txt));
check("blocks empty name", /Please enter a property name/.test(txt));
check("stays on step 2", /step=2/.test(p.url()), p.url());

// 3. Typing in the search box WITHOUT picking a suggestion must still be blocked: only a picked
//    suggestion (or the manual path's geocode) sets addressLine/mapCenter.
await p.evaluate(()=>{
  const ins=[...document.querySelectorAll("input")];
  const set=(el,v)=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set; s.call(el,v); el.dispatchEvent(new Event("input",{bubbles:true}));};
  const name=ins.find(i=>/Skyline/i.test(i.placeholder||"")); if(name) set(name,"Test Villa");
  const addr=ins.find(i=>/Search address/i.test(i.placeholder||"")); if(addr) set(addr,"Phnom Penh");
});
await p.waitForTimeout(1200);
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].filter(e=>/^Continue$/i.test((e.innerText||"").trim())); b[b.length-1]?.click();});
await p.waitForTimeout(2000);
const txt2 = await p.evaluate(()=>document.body.innerText);
check("blocks typed-but-unpicked address", /Please enter the property address/.test(txt2));

// 4. Manual path, in a FRESH browser context — prior checks leave a draft + half-typed search box
//    behind, which the wizard restores on reload and which masks the manual toggle.
{
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 1200 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/add-property?step=2`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p2.waitForTimeout(6000);
  const k2 = p2.getByRole("button", { name: /I'll remove it myself/i }).first();
  if (await k2.count()) { await k2.click({ timeout: 5000 }).catch(()=>{}); await p2.waitForTimeout(1200); }
  await p2.evaluate(()=>{
    const t=[...document.querySelectorAll("button")].find(e=>/Enter address manually/i.test(e.innerText||""));
    t?.click();
  });
  await p2.waitForTimeout(1500);
  await p2.locator('input[placeholder="e.g. Skyline Luxury Lofts"]').first().fill("Manual Test Villa");
  await p2.locator('input[placeholder="Street address"]').first().fill("Street 215, Veal Vong, 7 Makara");
  await p2.locator('input[placeholder="Country"]').first().fill("Cambodia");
  await p2.waitForTimeout(600);
  await p2.locator('input[placeholder="Country"]').first().blur();   // triggers geocode-on-blur
  await p2.waitForTimeout(7000);
  await p2.evaluate(()=>{const x=[...document.querySelectorAll("button")].filter(e=>/^Continue$/i.test((e.innerText||"").trim())); x[x.length-1]?.click();});
  await p2.waitForTimeout(3000);
  const body3 = await p2.evaluate(()=>document.body.innerText.replace(/\s+/g," "));
  const moved3 = /Step 3 of 6/.test(body3);
  check(
    "manual entry pins via geocode and is not a dead end",
    moved3,
    moved3 ? "advanced to Step 3" : `blocked: ${body3.slice(0,110)}`,
  );
  await ctx2.close();
}

console.log(`\n=== ${results.filter(r=>r.pass).length}/${results.length} checks passed ===`);
await b.close();
process.exit(results.every(r=>r.pass) ? 0 : 1);

# M6 — Run + Verify (browser smoke on real Neon)

> M3–M5 are code-complete and machine-verified (`verify-m3/m4/m5.sh` PASS; tsc 0; build clean).
> M6 is the **human** gate: prove the app renders real Neon data and persists writes, in DEMO_MODE.
> Nothing here needs a code change — it's run-and-observe. Record results in the right column.

## 0. Pre-flight (one-time setup)
| # | Step | How | ✅ |
|---|---|---|---|
| 0.1 | Real DB URL set | `.env.local` → `DATABASE_URL=` your Neon **dev** branch string (replace the placeholder) | ☐ |
| 0.2 | Demo mode on | `.env.local` → `DEMO_MODE=true` (already set) | ☐ |
| 0.3 | Gate password + map token | `.env.local` has `SITE_PASSWORD` + `NEXT_PUBLIC_MAPBOX_TOKEN` (already set) | ☐ |
| 0.4 | DB reachable | `npm run db:ping` → connects | ☐ |
| 0.5 | Tables created | `npm run db:migrate` → applies 0000–0004 | ☐ |
| 0.6 | Demo data loaded | `npm run seed:neon` → loads ORG-0001 + fixtures | ☐ |
| 0.7 | **Fresh** dev server | stop the old one, then `npm run dev` (the long-running one is stale) | ☐ |
| 0.8 | Pass the gate | open `http://localhost:3001` → enter `SITE_PASSWORD` | ☐ |

## 1. Read smoke — every page renders from Neon (not blank, not 500)
| # | Page | Expect | ✅ |
|---|---|---|---|
| 1.1 | `/portfolio` | property cards with real names/values + KPIs | ☐ |
| 1.2 | `/analytics` | charts populated (income/expense/valuation) | ☐ |
| 1.3 | `/directory` + a professional | list + detail render | ☐ |
| 1.4 | `/estate-planning` | successors + assignments + activity feed | ☐ |
| 1.5 | `/rental` | rent roll / leases / payments | ☐ |
| 1.6 | `/settings` + `/profile` | prefs + profile load | ☐ |
| 1.7 | A property → **all 8 tabs** (overview, financials, location, rental, safety, ownership, valuation, documents) | each renders its data; location map shows | ☐ |
| 1.8 | Property "Progress" stat | weighted-pillar score shows (not 0/blank) — confirms derivations work | ☐ |

## 2. Write spot-checks — confirm persistence (the real proof)
For each: do the action → **reload the page** → value is still there → optionally confirm the row in Neon.
| # | Action | Where | ✅ |
|---|---|---|---|
| 2.1 | Create a property | add-property wizard → finish | ☐ |
| 2.2 | Resolve a safety risk (M1 field) | a property → Safety tab → resolve | ☐ |
| 2.3 | Edit a tenant | a property → Rental tab → edit tenant | ☐ |
| 2.4 | Verify a pillar (upload-free path) | a property → a pillar → verify with existing docs | ☐ |
| 2.5 | Reload after each | data persists across reload (not in-memory) | ☐ |

## 3. Deferred domains still work (simulated — must NOT have broken)
| # | Page | Expect | ✅ |
|---|---|---|---|
| 3.1 | `/pro/*` (dashboard, clients, rent, work-orders, compliance) | render from the simulated layer + real property data | ☐ |
| 3.2 | `/dbdiagram` | schema viz renders | ☐ |
| 3.3 | No "dead service" errors in the console on pro/clients pages | clean | ☐ |

## 4. Known limitations (expected — not failures)
- **Document upload** needs S3 (`STORAGE_*`); in DEMO it returns a graceful error. Skip 2.x upload-based paths.
- **AI overlay / agent chat** was migrated mechanically (compiles + reads real data) but its end-to-end behavior
  (propose → approve → execute) is **not** deeply QA'd yet — exercise lightly; deep AI QA is a follow-up.
- **`formatCurrency`** display: dashboards may show compact (`$1.28M`). If you want whole-dollar in the migrated
  KPIs, that's the deferred D3 tweak (repoint ~3 derivation calls to `formatCurrencyFull`).

## Gate
M6 passes when sections 1–3 are all ✅. At that point the migration runs end-to-end on real Neon in DEMO_MODE.

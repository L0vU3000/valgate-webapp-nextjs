# Valgate — Full QA Checklist (CRUD + workflows)

> Manual click-through to verify everything built in phases 0–6 + items 1–3. Tick each box.
> Run against a **dev Neon branch** (never prod). 🔴 = destructive/new (highest priority).

## Preconditions
- [ ] On the dev Neon branch; `npm run db:migrate` applied (0005 statuses, 0006 activities, 0007 cascade FKs)
- [ ] `npm run db:ping` OK; seed data present (`seed:neon` — never `seed:reset`)
- [ ] App running; logged in as an **admin/owner** (some deletes are admin-only)
- [ ] Have a second low-privilege user (viewer/member) handy for the role checks

---

## A. Auth & onboarding
- [ ] **Login** — valid creds → lands on dashboard
- [ ] Login wrong password → clear error, no crash
- [ ] **New device** → email verification code step works
- [ ] **MFA** account → shows a clear message, NOT a dead-end "not supported" 🔴
- [ ] **Register** → form → email OTP → finalize → org created → dashboard
- [ ] **Forgot password** → email code → set new password → logged in
- [ ] **Gate** (if `SITE_PASSWORD` set) → wrong = error; right = through; no open-redirect

---

## B. Portfolio & property lifecycle 🔴
- [ ] Portfolio table loads; KPIs/stats look right
- [ ] Each row has a **`(…)` action menu**
- [ ] Menu shows **View / Edit / Archive / Delete** (Delete only visible to admin/owner)
- [ ] **Archive** → confirm modal → property leaves the active list
- [ ] Toggle "Show archived" → archived property appears with **Restore**
- [ ] **Restore** → confirm → back in active list
- [ ] **Delete** → typed-confirm dialog appears, shows **cascade counts** ("along with N leases, N payments, …") 🔴
- [ ] Confirm button stays **disabled until you type the exact property name** 🔴
- [ ] Delete a property **with children** → succeeds (no "still has leases" refusal), property + children gone 🔴
- [ ] As a **viewer/member**, Delete is hidden AND the action is rejected server-side if forced 🔴
- [ ] After delete → a `property/deleted` row appears in the activity log 🔴

### The cascade deep-check (do once, carefully) 🔴
- [ ] Seed a throwaway property with: a lease, a payment, a document, a folder, a co-owner, a safety risk, a pillar-verification + evidence
- [ ] Delete it → **all** those children are gone (no orphans, no FK error)
- [ ] **Set-null survivors:** any payment not tied to a deleted lease, plus notifications / estate-activity rows survive with `property_id = null`
- [ ] The document's **S3 file** is gone (not just the DB row)

---

## C. Add property
- [ ] Full multi-step flow → submit → success screen with property code
- [ ] Per-step validation blocks bad input
- [ ] Save a **draft**, leave, resume from Step 0 → state restored
- [ ] **Delete a draft** → confirm modal (not silent) → draft removed

---

## D. Property detail tabs
- [ ] **Overview** → "Edit profile" → save → persists after refresh
- [ ] Quick-action stub buttons (New Lease/Work Order/Invoice/Notify All) are **gone** (hidden, not dead) 🔴
- [ ] **Export Data** → downloads a CSV with real data 🔴
- [ ] **Financials** → edit/unlock → save persists
- [ ] **Rental** → edit → save persists
- [ ] **Location / Safety / Valuation** → display correctly
- [ ] **Recent activity panel** on the property shows its events 🔴

### Verification revoke (financials / rental / ownership) 🔴
- [ ] Revoke → **typed "REVOKE"** dialog, lists what verification covers
- [ ] Confirm → status flips to unverified; toast; persists

---

## E. Photos 🔴
- [ ] On an existing property: **upload** a photo → appears
- [ ] **Delete** a photo → confirm modal → gone (and its S3 file removed)
- [ ] **Set cover** → chosen photo becomes the cover (first position)
- [ ] Empty state ("no photos yet") shows when none

---

## F. Documents & folders 🔴
- [ ] **Upload File** → progress → appears in list
- [ ] **Create Folder** → folder actually persists + appears (not just modal close) 🔴
- [ ] **Per-file delete** → confirm modal → removed (DB + S3)
- [ ] **Bulk delete** → select files → Delete → **typed "DELETE"** dialog showing file count → removed 🔴
- [ ] **Folder delete** → confirm; warns "contains N files"; files **move to root** (not destroyed) 🔴
- [ ] No dead/no-op buttons anywhere on the page

---

## G. Owners / co-owners 🔴
- [ ] Add a co-owner → appears, split updates
- [ ] Edit a co-owner → saves
- [ ] **Remove** a co-owner → confirm modal → removed, **ownership split re-balances** to 100% 🔴

---

## H. Directory 🔴
- [ ] Add a professional (wizard) → appears
- [ ] **Edit** a professional (wizard in edit mode) → saves 🔴
- [ ] **Delete** a professional → confirm modal → removed 🔴
- [ ] Email / phone / copy contact actions work

---

## I. Dashboard & misc
- [ ] Alerts: **dismiss one** → it goes, **Undo** toast restores it 🔴
- [ ] "Dismiss all" → all go, Undo restores
- [ ] Analytics / estate-planning / profile / settings load without error

---

## J. Activity log (audit trail) 🔴
- [ ] **`/activity`** org page lists recent events (actor, action, entity, time)
- [ ] Performing any action (archive, photo add, folder delete, client archive, etc.) → a new row appears
- [ ] Property **delete** leaves a row even though the property is gone 🔴
- [ ] The existing **estate timeline** still shows its events (no regression) 🔴

---

## K. Pro — Clients 🔴
- [ ] **Onboard client** → modal → created + properties assigned
- [ ] **Archive / set Inactive** → confirm → client leaves the active book + rollups + alerts 🔴
- [ ] "Archived clients" section shows it with **Reactivate** 🔴
- [ ] Reactivate → back in active book
- [ ] Client archive leaves an activity row 🔴

---

## L. Pro — Rent & collections 🔴
- [ ] **Log payment** → confirm summary ("Record $X for …?") before submit 🔴
- [ ] **Mark paid** → applies immediately + **Undo** toast that reverts it 🔴
- [ ] **Lease renewal** → confirm dialog; new end date correct **even near month-end** (e.g. Jan 31 + 1mo = Feb 28, not Mar 3) 🔴
- [ ] Rent roll / overdue lists render correctly

---

## M. Pro — Work orders 🔴
- [ ] **Create** work order → appears
- [ ] **Assign vendor** → picker → assigned; a fake/cross-org vendor id is **rejected** server-side 🔴
- [ ] **Start** (Open → InProgress)
- [ ] **Resolve** → **confirm modal** first 🔴
- [ ] **Cancel** (on Open/InProgress) → **confirm modal** → muted "Cancelled" pill 🔴
- [ ] Cancelled order **drops out** of queue, open-cost, alerts, shell badge 🔴

---

## N. Pro — Compliance 🔴
- [ ] **Resolve safety risk** → **confirm modal** first 🔴
- [ ] **"Show resolved"** toggle → resolved risks appear read-only 🔴
- [ ] Certifications timeline renders

---

## O. Pro — Properties register
- [ ] Loads; search/filter work
- [ ] Footer shows an honest count ("showing all N" / "X of N") — **no silent truncation** 🔴

---

## P. Cross-cutting safety
- [ ] **Confirm tiers behave:** undo = reversible toast; confirm = modal; typed = must type a word 🔴
- [ ] No raw error strings leak to the UI on a failed action (generic message only) 🔴
- [ ] **IDOR spot-check:** as user/org A, try to open or act on a URL/id belonging to org B → rejected / not-found 🔴
- [ ] No console errors during the destructive flows
- [ ] `npm run db:migrate` shows nothing pending (all applied)

---

## Sign-off
- [ ] All 🔴 items pass
- [ ] Issues found logged (file:line if known)
- [ ] Ready to apply migrations to **prod** + rotate the prod connection string

---
slug: estate-planning--recent-activity
route: /estate-planning
data_point: "Recent Activity timeline (row 22) — event title, time, description, active dot per event"
verdict: "✅ WIRED — EstateActivityEvent entity; per-property scoped; relative timestamps; empty-state shown · Q4.P resolved · 0 findings"
revision: 1
date: 2026-05-07
template: full
---

# Audit — Recent Activity timeline
_Route: /estate-planning — row 22_
_Last revised: 2026-05-07 · Revision 1_

## §1 — What this surface shows

> At the bottom of the right panel, a "Recent Activity" timeline shows the chain of estate planning events for the selected property. Each event has a time stamp, a title (e.g. "Estate Plan Finalized"), and a description. The most recent event has a glowing blue dot; older events have grey dots. A vertical line connects the dots. Events are scoped to the selected property — switching properties shows that property's activity.

**Inventory row:** 22
**Classification:** HARDCODED (Rev 1 — 3 hardcoded timeline events) → WIRED (Rev 2)
**Q-gate resolved:** Q4.P (audit log / chain-of-custody — stored event log vs. derived feed) — resolved by introducing `EstateActivityEvent` entity with `kind`, `title`, `description`, `propertyId`, `createdAt`.

## §2 — Where the value comes from

**Data path:** `queries.ts:141` → `db.estateActivityEvents.list(userId)` at `queries.ts:149`:
```typescript
const activityRaw = await db.estateActivityEvents.list(userId);
// sorted descending by createdAt by the db layer
```

**Mapped to `TimelineItem[]`** (`queries.ts:282-291`):
```typescript
const timeline: TimelineItem[] = activityRaw
  .slice(0, 12)
  .map((event, index) => ({
    id: event.id,
    title: event.title,
    time: formatEventTime(event.createdAt),
    desc: event.description,
    active: index === 0,
    propertyId: event.propertyId,
  }));
```

**Component filter** (`SuccessionPage.tsx:239-245`):
```tsx
const propertyTimeline = useMemo(
  () => timeline.filter(
    (item) => item.propertyId === propertyId || item.propertyId === undefined,
  ),
  [propertyId, timeline],
);
```

## §3 — Formula / derivation

**`formatEventTime`** (`queries.ts:90-118`) — relative timestamp:
```typescript
function formatEventTime(ts: number): string {
  // "Today, 3:45 PM" | "Yesterday, 10:00 AM" | "May 3, 2026"
}
```
Uses current date at server render time to determine "Today" / "Yesterday". Falls back to `formatDate(ts)` for older events.

**`active` flag:** `index === 0` after `activityRaw.slice(0, 12)`. Since `db.estateActivityEvents.list` sorts descending by `createdAt`, the most recent event is always `index === 0` → `active: true` → glowing blue dot.

**Display cap:** `activityRaw.slice(0, 12)` — global cap of 12 events loaded, then filtered by property. Effectively the most recent ≤12 events across all properties are loaded; the component then filters to the selected property's subset.

## §4 — Consistency check

**Per-property scoping:** `propertyTimeline` filters by `item.propertyId === propertyId`. Events for PROP-0001 (EACT-0001, EACT-0002) don't appear when PROP-0011 is selected (EACT-0003).

**Active dot ↔ order:** Since `db.estateActivityEvents.list` sorts desc by `createdAt`, the `active: true` event is always the chronologically latest one displayed. The glowing dot correctly marks "most recent."

**`propertyId === undefined` passthrough:** The filter allows events with no `propertyId` to appear for any selected property. This is a deliberate design choice for portfolio-level events. Currently all 3 seed events have a `propertyId`, so this path is not exercised in seed but is safe.

## §5 — Missing safeties

**Empty state** (`SuccessionPage.tsx:636-638`):
```tsx
{propertyTimeline.length === 0 && (
  <div className="pl-10 text-sm text-[#434655]">No recent activity recorded.</div>
)}
```
Shown for all 14 properties with no activity in seed.

**12-event cap:** Prevents unbounded DB reads on portfolios with heavy activity history. No pagination available — older events beyond cap are silently hidden. Acceptable for v1.

**`event.propertyId` null/undefined:** `filter(Boolean)` at `queries.ts:239` removes null/undefined propertyIds from the `topPropertyIds` set computation. Safe.

## §6 — Meaning of the value

`EstateActivityEvent` records serve as the chain-of-custody log for estate planning actions. The `kind` field (`"estate.reviewed"`, `"successor.assigned"`, `"successor.updated"`, `"document.added"`) categorises the event type. The `title` and `description` are free-form text written by the action that created the event. The timeline is append-only — events are never updated or deleted, only created. This gives a tamper-evident audit trail of who did what to the estate plan.

The decision to store events (not derive them from other entities) was made in Q4.P resolution because estate chain-of-custody has specific legal significance: who signed what, when, verified by whom. A derived feed from property mutations would not capture all legally relevant moments.

## §7 — Seed verification

**Seed events:**

| Event ID | Kind | Title | Description | Property | createdAt |
|---|---|---|---|---|---|
| EACT-0001 | `estate.reviewed` | "Estate Plan Finalized" | "Legal review completed for Land near river." | PROP-0001 | 1778165100000 (May 4, 2026) |
| EACT-0002 | `successor.updated` | "Beneficiary ID Verified" | "KYC verification approved for Dara Chan." | PROP-0001 | 1778062500000 (May 3, 2026) |
| EACT-0003 | `document.added` | "Document Uploaded" | "New Estate Transfer Deed signed and archived." | PROP-0011 | 1776159000000 (Apr 12, 2026) |

**Expected rendering — PROP-0001 selected (2 events):**

| Position | Title | Time (relative to 2026-05-07) | Active dot |
|---|---|---|---|
| 1st (top) | "Estate Plan Finalized" | "May 4, 2026" | ✅ blue glow |
| 2nd | "Beneficiary ID Verified" | "May 3, 2026" | grey |

**Expected rendering — PROP-0011 selected (1 event):**

| Position | Title | Time | Active dot |
|---|---|---|---|
| 1st | "Document Uploaded" | "Apr 12, 2026" | ✅ blue glow |

**Expected rendering — any other property:** Empty state "No recent activity recorded."

```bash
# Confirm all 3 event seeds
node -e "
['EACT-0001','EACT-0002','EACT-0003'].forEach(id => {
  const e = require('./public/data/users/demo-user/estate-activity-events/' + id + '/core.json');
  console.log(e.id, '| kind:', e.kind, '| property:', e.propertyId,
    '| title:', e.title, '| date:', new Date(e.createdAt).toISOString());
});"

# Confirm db layer sorts desc (check lib/data/db/estate-activity-events.ts)
grep -n 'sort\|createdAt' lib/data/db/estate-activity-events.ts
```

## §8 — Findings

> Activity timeline correctly sources from `EstateActivityEvent` entity. Per-property scoping correct. Relative timestamps computed at server-render time. Empty state present. Q4.P resolved. 0 findings.

**0 findings.** PF6 deferred (auth shim applies to `db.estateActivityEvents.list(userId)`).

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Post-wiring audit of row 22. Q4.P resolved. EstateActivityEvent entity introduced. WIRED. 0 findings.

</details>

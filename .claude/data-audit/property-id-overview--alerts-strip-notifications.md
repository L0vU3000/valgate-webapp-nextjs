---
slug: property-id-overview--alerts-strip-notifications
route: /property/[id]/overview
data_point: "Action strip — stored Notification alerts (row 16, Notification entity merge)"
template: full
verdict: "✅ Correct · 2 findings (1 P1, 1 P3) · NOTIF-0001 renders for PROP-0001; linkTo URL parse verified"
revision: 1
date: 2026-05-06
---

> **Plain opener:** The action strip on the right sidebar of the overview page shows alerts that need attention. Before Phase 6.8, one item was hardcoded ("HVAC Fault"). After Phase 6.8, that slot is replaced by real Notification rows read from the database, filtered to the current property by parsing the `linkTo` URL field. The lease-expiring alerts (Phase 6.1) remain untouched alongside.

📄 **Page audit:** [property-id-overview/audit.md](pages/property-id-overview/audit.md) — cite `PF1` for systemic finding.

---

## §1 — What the user sees

The "Action strip" sidebar card shows:
1. A header: "N actions pending" (where N = total alerts count)
2. A list of alert rows, each with: colored dot · category label · body text · action button

**Sources merged in the strip (Phase 6.8 state):**
- Source A: Derived lease-expiring alerts (Phase 6.1, unchanged) — amber dot, "Lease" label, expiry countdown
- Source B: Stored Notification rows (Phase 6.8, NEW) — color from category, label from category, `notification.description` as body

For PROP-0001: NOTIF-0001 (category: "MAINTENANCE", title: "Burst pipe at PP00016", description: "Burst pipe in basement utility room — water supply shut off. Awaiting plumber.", linkTo: "/property/PROP-0001/safety") renders as an alert. Lease-expiring alerts render if any lease has `endDate` within 30 days.

---

## §2 — Source trace

**Notification filter (server-side, `overview/queries.ts`):**

```typescript
function notificationMatchesProperty(notification: Notification, propertyId: string): boolean {
  if (!notification.linkTo) return false;
  const match = notification.linkTo.match(/^\/property\/([^/]+)\//);
  return match ? match[1] === propertyId : false;
}
// applied: allNotifications.filter(n => notificationMatchesProperty(n, propertyId))
```

**Alert construction (PropertyOverviewPage.tsx):**

```typescript
const notificationAlerts = notifications.map((n) => ({
  id: n.id,
  type: "notification" as const,
  category: n.category,
  body: n.description,
  action: "View",
  actionLabel: `View ${n.title}`,
}));
const alerts = [
  ...leaseAlerts,          // Phase 6.1 — untouched
  ...notificationAlerts,   // Phase 6.8 — NEW
];
```

**Display mapping (`getAlertDisplay` helper):**

```typescript
function getAlertDisplay(type: string, category?: string): { dotClass, labelClass, label } {
  if (type === "lease") → amber dot, "Lease"
  if (category === "COMPLIANCE") → rose dot, "Compliance"
  if (category === "PAYMENT") → amber dot, "Payment"
  if (category === "LEASING") → blue dot, "Leasing"
  default (MAINTENANCE / APPLICATIONS / undefined) → amber dot, "Maintenance"
}
```

**Entity:** `Notification` — `lib/data/types/notification.ts`, `lib/data/db/notifications.ts`

**Seed for PROP-0001:** NOTIF-0001 (`category: "MAINTENANCE"`, `linkTo: "/property/PROP-0001/safety"`, `description: "Burst pipe in basement utility room — water supply shut off. Awaiting plumber."`)

---

## §3 — Formula / derivation correctness

**linkTo URL parse — 3 mental walks:**

| Input | Regex match | Result |
|---|---|---|
| `"/property/PROP-0001/safety"` | `match[1] = "PROP-0001"` | ✅ Included (matches propertyId) |
| `undefined` | no match (early return) | ✅ Excluded |
| `"/portfolio"` | no `/property/` prefix | ✅ Excluded |

**Category display mapping verification:**
- NOTIF-0001 category = "MAINTENANCE" → falls through to default → amber dot, "Maintenance" label ✓
- COMPLIANCE notifications → rose dot, "Compliance" ✓
- PAYMENT notifications → amber dot, "Payment" ✓
- LEASING notifications → blue dot, "Leasing" ✓

**Phase 6.1 boundary:** `leaseAlerts` derivation (filter `stage=Signed, endDate > now, endDate - now <= 30d`) is untouched. The strip renders lease alerts FIRST, then notification alerts.

**Strip header count:** `alerts.length` = leaseAlerts.length + notificationAlerts.length — correct union count.

---

## §4 — Consistency checks

- If no notifications match the property, `notificationAlerts = []` → strip shows lease-expiring only (if any). ✓
- If no lease-expiring and no notifications, `alerts = []` → strip hidden (`alerts.length > 0` guard). ✓
- PROP-0002 (different property): no notifications with `/property/PROP-0002/` linkTo → strip shows only lease-derived alerts for that property. ✓
- The "Dismiss all" button and individual action buttons are not wired to mutations (deferred — interaction is a server-action concern). Labels still use `actionLabel` for accessibility. ✓

---

## §5 — Missing safeties / edge cases

**Empty notifications array:** `notificationAlerts = []`, `alerts = [...leaseAlerts]` — strip renders lease alerts only. ✓

**Notification with `linkTo` that doesn't include a property ID** (e.g. `"/property/"` malformed): regex match returns `null` → excluded. ✓

**Notification with `read: true`:** Currently no filtering on `read` status — all notifications for the property surface, regardless of read state. This is a future enhancement (show unread only, or mark as read on dismiss). Not a correctness bug.

---

## §6 — Meaning / label accuracy

The alert strip shows "N actions pending" where N = total alerts (lease-expiring + notifications). Each row's category label ("Lease", "Maintenance", "Compliance", etc.) accurately identifies the source. The `action` button label ("Review →" for leases, "View →" for notifications) is semantically appropriate.

The Q4.F HYBRID decision is correctly implemented: no notification rows are auto-created for lease-expiring events — those are derived at query time. Only manually-authored notifications (NOTIF-0001 etc.) appear from the Notification table.

---

## §7 — Q4.F resolution documented

> **Q4.F resolved Phase 6.8 (2026-05-06):** HYBRID per source. Lease-expiring → derived at render time via `Lease.endDate` arithmetic (Phase 6.1). Manual/stored alerts → `Notification` rows filtered by `linkTo` URL parse (Phase 6.8). Auto-creation of Notification rows (cron, mutation hooks) deferred to Convex/Neon backend phase. See `ref/05-open-questions.md` Q4.F for full resolution note.

> **Q5.T filed Phase 6.8:** `Notification.propertyId` missing — `linkTo` parse is the workaround for property-scoping. Schema gap noted; see `ref/05-open-questions.md` Q5.T.

---

## §8 — Findings

### 🟡 F1 — PF1: userId leak — `db.notifications.list(userId)` fetches all user notifications; filter by linkTo parse client-side (systemic)
**Severity:** P1 (systemic)
**Page-wide:** `Page-wide: see PF1 in pages/property-id-overview/audit.md`
**Fix:** Already tracked at page level.

---

### 🟡 F2 — `read` status not filtered — all notifications surface regardless of read state
**Severity:** P3 (UX gap, not a data correctness issue)
**Observation:** The Notification entity has a `read: boolean` field. The current implementation shows all matching notifications regardless of read status. A dismissed or already-read notification continues to appear in the strip on next load.
**Fix:** For the FS demo era, this is acceptable (no "mark as read" write path exists). When the backend phase ships the Notification write path, add a `read: false` filter or a dismiss-to-mark-as-read action.
**Deferred:** Backend phase (server action + Convex mutation).

---

## 🔍 Source files & hashes

<details>
<summary>Source file checksums at time of audit</summary>

| File | Role |
|---|---|
| `lib/data/types/notification.ts` | Entity type + Zod schema |
| `lib/data/db/notifications.ts` | DB layer |
| `app/(shell)/property/[id]/overview/queries.ts` | Data fetching + linkTo filter |
| `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` | Component + alert union |

</details>

---

## 📜 Revision history

<details>
<summary>Revision log</summary>

### Revision 1 — 2026-05-06
- Phase 6.8 wiring complete. Row 16 alerts strip HVAC Fault hardcode removed; Notification entity merged.
- Q4.F resolved: HYBRID decision documented in full.
- Q5.T filed: Notification.propertyId schema gap noted.
- F2 filed: `read` status not filtered (deferred to backend phase).

</details>

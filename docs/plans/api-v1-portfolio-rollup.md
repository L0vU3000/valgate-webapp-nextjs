# `/api/v1` portfolio rollup — for the native `/app` Dashboard

Status: **proposal, not implemented.** Owner decision needed on three points
(§6). iOS is blocked on this; the web app already computes most of it for its own
`/app` surface.

## 1. Why

The native iOS app must render the pen's `/app` Dashboard (`valgate-ios.pen`,
frame `F7x13T`). The iOS client may only use documented `/api/v1/*` HTTP
endpoints (`valgate-ios/AGENTS.md` rules 3–4), and nothing on that surface today
exposes what the frame draws:

| Frame element (verbatim) | Source today |
|---|---|
| `Rent collected this month` · `$6,040` · `of $9,240 expected · 2 of 3 paid` · progress bar | **nothing** |
| `Next rent` · `$3,200` · `77 Kestrel · 26 Oct` | `/api/v1/rental` has `nextPayoutAmountNumeric` + `nextPayoutAt`; no property name |
| `Arrears` · `None` · `Nothing overdue` | **nothing** (web computes it in a UI-shaped derivation) |
| `Needs attention` (insurance expired / gas safety expiring) | **nothing** |
| `Properties owned` · `4` / `Rented` · `3 of 4` | `/api/v1/properties`, `/api/v1/rental` ✓ |
| `Deposit held` · `$9,570` | **nothing** |
| `Recent activity` (5 rows, `Rent ledger ›`) | **nothing** portfolio-wide |

The data is not missing from Valgate — it is missing from this surface. The web
already derives it from `properties`, `leases`, `payments`, `certifications`,
`inspections` and `documents`, which is exactly why the endpoint can be small.

## 2. Shape of the change

**Additive extension of `GET /api/v1/rental`**, per the owner's decision. The DTO
grows; nothing is renamed or removed. Swift decoders ignore unknown keys, so the
existing client is unaffected until it opts in.

```
RentalRollupDtoV1 = RentalSummaryDtoV1 ∪ {
  monthLabel: string,                    // "October 2026 (UTC)" — display only
  collectedAmountNumeric: number | null,
  expectedAmountNumeric: number | null,
  paidCount: number,                     // "2 of 3 paid"
  dueCount: number,
  overdueAmountNumeric: number | null,   // the Arrears tile; null when nothing is overdue
  overdueCount: number,
  depositHeldNumeric: number | null,
  attention: AttentionItemDtoV1[],       // capped, display-only
  activity: ActivityItemDtoV1[],         // capped at 5, display-only
}

AttentionItemDtoV1 = { kind: "certificate" | "inspection" | "risk",
                       title: string, propertyName: string,
                       dueAt: number | null, status: "Expiring" | "Overdue" }

ActivityItemDtoV1  = { kind: "payment" | "document" | "inspection",
                       title: string, propertyName: string,
                       at: number, amountNumeric: number | null }
```

### Conventions this must follow (already true of the sibling DTOs)

- **Numbers, not prose.** `computeArrears` and `computeKpis` currently return
  formatted strings (`"$2,850"`) and, for arrears, Tailwind class names
  (`bg-amber-400`) and a bar width. Those are view models. The endpoint must
  publish raw numerics plus counts and let each client format — otherwise iOS has
  to parse `"$2,850"` and the web's Tailwind palette leaks into the contract.
- **Null means "not collected", never zero.** Matches the existing
  `nextPayoutAmountNumeric: null` rule in `toRentalSummaryDto`. An org with no
  rental data gets zeros and nulls, not a fabricated `$0`.
- **Timestamps are epoch milliseconds**, as everywhere else in v1.
- **No internal identifiers, ever.** No `leaseId`, `tenantId`, `paymentId`,
  `documentId`, storage ids, or `orgId` — including inside `attention`/`activity`.
  Those rows are display strings with a kind and a date only. This keeps the
  existing "no lease, tenant, or payment rows" guarantee intact: the rows carry no
  handle a client could use to fetch the underlying record.
- **Caps, no cursors.** `attention` and `activity` are the frame's fixed peek
  sections; they are capped server-side (suggest `attention` ≤ 5, `activity` = 5)
  and are not paginated. `activity` is newest-first.
- **Empty org:** zeros, nulls, empty arrays, HTTP 200. This route has no
  per-property id, so it must never 404.

## 3. What to reuse (do not re-derive)

`lib/services/rental-summary.ts` already loads `properties`, `leases`, and
`payments` in one `Promise.all` — extend that function, do not add a second
loader:

| Field group | Existing code |
|---|---|
| `occupancyPercent`, `occupiedCount`, `totalCount`, `tenancyCount` | `computeOccupancySummary`, `computeTenancyCount` |
| `nextPayoutAmountNumeric`, `nextPayoutAt` | `computeNextPayout` |
| `collectedAmountNumeric`, `expectedAmountNumeric`, `monthLabel` | `computeKpis` (`monthlyCollected`, `monthlyExpected`, `monthLabel`) — but return the numerics, not the formatted strings |
| `overdueAmountNumeric` | `computeArrears` totals, summed; return the number, not the `$` string |
| `paidCount`, `dueCount` | **new, small**: `payments` (kind `Rent`, status `Paid`, `date >= monthStart`) and `leases` (stage `Signed`, `endDate >= monthStart`), mirroring the filters already inside `computeKpis` |
| `depositHeldNumeric` | **new**: `sum(Paid Deposit) − sum(Paid Refund)` — see §6 |
| `attention` | `listCertifications` / `listSafetyRisks` / `listInspections` via the `Expiring`/`Overdue` states already modelled in `lib/data/derivations/compliance.ts` |
| `activity` | union of recent `payments` / `documents` / `inspections`, newest-first, capped |

`computeKpis` and `computeArrears` keep their current shape for the web surfaces
that already consume them; the endpoint stops using their formatted strings rather
than changing them.

## 4. Tests to add

Extend `app/api/v1/rental/route.test.ts` (and `lib/api/v1/dto.test.ts` for
serialisation):

1. A fixture org with 4 properties, 3 signed leases, 2 rent payments marked
   `Paid` this month → `paidCount: 2`, `dueCount: 3`, `collectedAmountNumeric`
   equals the two payments, `expectedAmountNumeric` equals the three lease rents.
2. An org with no rental data → zeros/nulls/empty arrays, HTTP 200 (the
   null-not-zero rule).
3. **No identifiers**: assert the serialised JSON contains none of
   `leaseId`, `tenantId`, `paymentId`, `documentId`, `orgId`, `storageId` — the
   guarantee this feature could quietly break.
4. `overdueCount: 0` → `overdueAmountNumeric: null` (not `0`), so the client's
   "Nothing overdue" state is driven by real data.
5. `activity` is capped and newest-first.

## 5. iOS follow-up (after this lands)

1. Mirror the shape here into `valgate-ios/docs/API-CONTRACT.md` — mirror only,
   never propose from the iOS side.
2. Add the client route + DTO for the portfolio rollup (iOS currently has only
   the per-property `rentalSummary(propertyId:)`; there is no client path to
   `GET /api/v1/rental` at all).
3. Then rebuild `DashboardView` against frame `F7x13T` for real. The version
   shipped in `049742f` was built from `DASHBOARD_SPEC.md` §2, a stale text
   revision of a different screen, and must be replaced — not layered.

## 5b. Other screens the same data would unblock

Independent agents auditing the design frames against the iOS build each hit the
same wall — a designed element with no field behind it. Recorded here so the
web-side change can be scoped once rather than four times:

| Frame | Designed element | Missing field |
|---|---|---|
| `h0Ti6u` — top-level `/rental` (**not built at all**) | expected rent total, per-property paid/due list, history, deposits held | the rollup above. This screen is unimplemented because nothing backs it |
| `quGzO` — per-property Rental | tenant name; lease date range; deposit + "protected"; payment-history rows | `PropertyRentalSummaryDto` is aggregates-only by design and has none of these |
| `o3GLKa` / `VAtkV` — Documents | `Needs attention · 4` / `On file · 6` split; `Expired` / `Expires in 9 days` / `In review` / `Superseded` badges | document status, expiry, review state — `DocumentListItemDto` has none |
| `F2W1Jw` — Document preview | status badge, `Renew by …`, Issued/Expires rows | same as above |
| `cD59h` — Profile | Documents tile count | no portfolio-wide document count exists; the only source is the paginated per-property endpoint, i.e. N+1 |

Two of these are cheap to decide and worth folding into the same change: a
**document status/expiry** field pair would light up three frames, and a
**portfolio document count** is one integer that removes an N+1.

One related defect, found while auditing the Edit page and *not* an API-shape
question: clearing a field in the iOS Edit form PATCHes `null`, which the write
schema reads as "no change", so **an optional field cannot be cleared**. Decide
whether `""` means "clear" before the iOS side tries to fix it.

## 6. Open questions for the owner

1. **Deposits.** `depositHeldNumeric` is the one number that cannot be derived
   confidently: `payment-import.ts` models deposits as payments (`kind: Deposit`
   / `Refund`), so "held" is an inference (`paid deposits − paid refunds`) rather
   than a stored balance. Publish the inference, add a real column, or drop the
   row from the design?
2. **Needs attention.** Which signals belong in it, and in what order? The frame
   shows a certificate expiry and a certificate expiring soon; safety risks and
   failed inspections are modelled too. "Top 5 by severity, overdue before
   expiring" is a guess.
3. **Activity sources.** Payments, documents, inspections — all three, or a
   narrower ledger? The frame's `Rent ledger ›` affordance implies a fuller ledger
   exists in the web, which would need its own endpoint.

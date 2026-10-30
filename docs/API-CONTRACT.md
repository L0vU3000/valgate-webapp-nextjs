# API v1 rental contract

This is the additive R526 contract for the Rental main page. Other API endpoints are documented in [api-v1.md](api-v1.md).

| Method | Route | Response |
| --- | --- | --- |
| GET | `/api/v1/rental` | Existing occupancy, tenancy count, next payout, monthly collection, overdue, deposit, document count, attention and activity fields, plus `tenancies[]`, `history[]`, and `upcoming[]` as described below. |

The authenticated caller context and route error behavior are unchanged: unexpected service or serialization failures return the generic 500 envelope. No new tables or migrations.

## Response fields

Existing fields remain: `occupancyPercent`, `occupiedCount`, `totalCount`, `tenancyCount`, `nextPayoutAmountNumeric`, `nextPayoutAt`, `currency`, `monthLabel`, `collectedAmountNumeric`, `expectedAmountNumeric`, `paidCount`, `dueCount`, `overdueAmountNumeric`, `overdueCount`, `depositHeldNumeric`, `documentCount`, `attention[]`, `activity[]`.

| Added field | Entry fields | Semantics |
| --- | --- | --- |
| `tenancies[]` | `propertyId: string`, `propertyName: string`, `tenantName: string \| null`, `monthlyRentNumeric: number`, `currency: "USD"`, `status: "paid" \| "due" \| "overdue" \| "upcoming"` | One row per currently active Signed lease, joined to its property and optional tenant. |
| `history[]` | `monthLabel: string`, `amountNumeric: number`, `paidCount: number`, `dueCount: number`, `state: "paid" \| "in_progress" \| "not_due"` | Five UTC calendar months, oldest first, ending at the existing `monthLabel`. Amount is collected Paid Rent; counts are paid Rent rows / total Rent rows for that month. |
| `upcoming[]` | `paymentId: string`, `propertyId: string`, `propertyName: string`, `dueAt: number`, `amountNumeric: number`, `currency: "USD"`, `state: "due_soon" \| "overdue"` | First five unpaid payments, all kinds, oldest due date first, joined via their lease to a known property. Ties use payment id. |

The month boundary reuses `computeMonthRentTotals().monthStart`; all month labels use the existing `"October 2026 (UTC)"` format. All three new arrays are `[]` for an empty org. `depositHeldNumeric` is unchanged, including its null-when-no-deposit behavior.

A tenancy considers only Rent payment rows in the current UTC month. All paid means `paid`; any unpaid row before now means `overdue`; an unpaid row exactly due now means `due`; otherwise it is `upcoming`. Multiple rows cannot hide an unpaid balance behind a paid row. Without a payment row, the due date recurs on the lease's UTC start day, clamped to the month's last day: due on/before now means `due`, otherwise `upcoming`. No missing row becomes `overdue`.

History marks a closed month `paid` only when it has at least one Rent payment and every Rent payment is Paid. An open month, an incomplete month or a month with no recorded Rent is `in_progress`. A future month would be `not_due`; the current five-month window ends at the current month and therefore contains no future months. The model has no settlement timestamp, so closed-month state reflects the currently recorded payment statuses.

`upcoming[].dueAt` is **Unix seconds**, rounded down. Existing `nextPayoutAt`, `attention[].dueAt` and `activity[].at` remain Unix milliseconds. The domain Payment service exposes `date`, which is also the due-date convention used by the existing next-payout derivation; its optional DB `dueDate` is not exposed by `listPayments`. Unpaid rows before now are `overdue`, otherwise `due_soon`, independent of their stored status label. Paid rows and payments whose property cannot be resolved from their lease are omitted.

`tenantName` comes from an additional org-scoped `listTenants(ctx)` read. Missing tenants or a tenant belonging to a different property yield null. Only the explicitly listed property/payment ids are newly public; nested DTOs still withhold lease, tenant, organization, user, document and storage ids.

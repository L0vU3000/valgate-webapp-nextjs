---
category: building
type: entity
priority: normal
created: 2026-07-16
approved: true
---

## Product capability
Record each property's utility accounts on the property detail so owners track providers,
account/meter numbers, and expected monthly cost.

## Entity contract
- Singular name: utilityAccount
- Plural name: utilityAccounts
- Table name: utility_accounts
- ID prefix: UTIL-
- Cache tag: utility-accounts

| Domain field | Zod type | DB column | DB type | Required | Default |
|---|---|---|---|---|---|
| provider | string | provider | text | yes | — |
| utilityType | enum(electricity,water,gas,internet,other) | utility_type | text | yes | — |
| accountNumber | string | account_number | text | no | null |
| meterNumber | string | meter_number | text | no | null |
| monthlyEstimate | number | monthly_estimate | numeric | no | null |
| notes | string | notes | text | no | null |

Relationship: `propertyId → properties.id`, delete cascade. Standard non-null orgId/userId.

## Demo fixture
One electricity account on PROP-0001: provider "EDC (Electricité du Cambodge)", utilityType
electricity, accountNumber "EDC-PP-104829", meterNumber "MTR-55021", monthlyEstimate 145.00,
notes "Main building supply".

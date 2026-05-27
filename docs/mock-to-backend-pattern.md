# Mock-to-Backend Pattern

*Last updated: May 2026*

A standard method for building UI features with mock data that can be swapped to **Neon PostgreSQL** with minimal code change.

The notifications feature is the reference implementation.

---

## The Problem

When building a feature before the backend exists, it's tempting to inline mock data directly inside the component. This works short-term but creates two problems:

1. The component owns data it shouldn't — mixing UI and data concerns
2. Wiring the backend later requires rewriting the component, not just the data layer

---

## The Structure

Four layers, each with a single responsibility:

```
lib/data/[feature].ts          — types + mock data
lib/hooks/use-[feature].ts     — client mutations (optional; swap point for actions)
lib/format.ts                  — display formatting utilities
components/[feature].tsx       — pure display component, receives props
```

For **Server Component** pages, the swap point is often `lib/data/[feature].ts` alone (async functions called from `page.tsx` or `queries.ts`).

### 1. Types + Mock Data (`lib/data/[feature].ts`)

Define the data shape here. Mock data lives alongside the types so both can be replaced together.

**Rules:**
- Export the TypeScript types — components import from here, not from each other
- Store timestamps as `number` (Unix ms) or `Date`, never as pre-formatted strings like `"2m ago"`
- Include fields Postgres will need even if the UI doesn't use them yet (e.g. `linkTo?`, `orgId`)
- Align field names with [`docs/database/prototype/schema.sql`](./database/prototype/schema.sql) when the table exists

```ts
// lib/data/notifications.ts

export type NotificationCategory = "MAINTENANCE" | "LEASING" | ...;

export interface Notification {
  id: string;
  orgId: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: number;  // timestamp — format at render time
  read: boolean;
  linkTo?: string;
}

const now = Date.now();

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    orgId: "org_demo",
    category: "MAINTENANCE",
    title: "New maintenance request",
    description: "Unit 3B • Water leak reported in bathroom",
    createdAt: now - 2 * 60 * 1000,
    read: false,
  },
  // ...
];
```

### 2. The Hook (`lib/hooks/use-[feature].ts`) — client-side features

This is the swap point for **client** trees that need live updates (e.g. notification panel).

Today it uses `useState` + mock data. When Neon is wired, call **Server Actions** or pass data from a parent Server Component — do **not** use Convex.

**Rules:**
- Mark `"use client"` — hooks are always client-side
- Leave `TODO(neon):` comments on every line that gets replaced
- Expose the same return shape regardless of data source
- Include all mutations the UI will need even if some aren't used yet

```ts
// lib/hooks/use-notifications.ts
"use client";

import { useState, useTransition } from "react";
import { MOCK_NOTIFICATIONS, type Notification } from "@/lib/data/notifications";
// TODO(neon): import { markAllReadAction, markAsReadAction } from "@/actions/notifications.actions";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [pending, startTransition] = useTransition();

  function markAllRead() {
    // TODO(neon): startTransition(() => markAllReadAction());
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markAsRead(id: string) {
    // TODO(neon): startTransition(() => markAsReadAction({ id }));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  return { notifications, markAllRead, markAsRead, pending };
}
```

**After Neon is wired**, mutations go through Server Actions; reads can stay in a parent Server Component or use optimistic updates:

```ts
// lib/hooks/use-notifications.ts (after backend)
"use client";

import { useTransition } from "react";
import { markAllReadAction, markAsReadAction } from "@/actions/notifications.actions";
import type { Notification } from "@/lib/data/notifications";

export function useNotifications(initial: Notification[]) {
  const [notifications, setNotifications] = useState(initial);
  const [pending, startTransition] = useTransition();

  function markAllRead() {
    startTransition(async () => {
      await markAllReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  }

  // ...
}
```

The display component and its consumers stay unchanged if props shape is stable.

### 3. Display Formatting (`lib/format.ts`)

Formatting utilities that transform raw data (timestamps, numbers) into display strings. Never put these inside components.

```ts
export function formatRelativeTime(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours   < 24) return `${hours}h ago`;
  if (days   === 1) return "Yesterday";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
```

### 4. The Component (`components/[feature].tsx`)

A pure display component. It receives data and callbacks as props — it owns neither.

**Rules:**
- No `useState` for server-owned data (unless optimistic UI)
- No inline mock arrays
- Import types from `lib/data/[feature].ts`
- Import formatters from `lib/format.ts`
- Accept mutation callbacks as props (`onMarkAllRead`, `onMarkAsRead`)

---

## Postgres schema

When the backend is ready, add or extend tables in **`docs/database/prototype/schema.sql`**, then migrate to Neon.

Example (aligned with prototype conventions):

```sql
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs(id),
  category    notification_category NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read        BOOLEAN NOT NULL DEFAULT false,
  link_to     TEXT
);
CREATE INDEX idx_notifications_org_read ON notifications(org_id, read);
```

Access via `lib/db` (Drizzle/Prisma/raw SQL — TBD) with **org_id from Clerk session**, never from client input alone.

---

## What changes when the backend is wired

| File | Change |
|---|---|
| `lib/data/[feature].ts` | Replace mock array with SQL queries; keep types |
| `lib/hooks/use-[feature].ts` | `useState` mocks → Server Actions + optional optimistic UI |
| `actions/[feature].actions.ts` | New — Zod, authz, SQL |
| `docs/database/prototype/schema.sql` | Table + indexes |
| `lib/db` / migrations | Connection + queries |
| Components | **No change** if props stable |

---

## Server Component variant (preferred for pages)

```ts
// lib/data/properties.ts
export async function getProperties(orgId: string): Promise<Property[]> {
  // today
  return structuredClone(properties);
  // TODO(neon): return db.select().from(properties).where(eq(properties.orgId, orgId));
}

// app/(shell)/page.tsx
export default async function HomePage() {
  const orgId = await requireOrgId();
  const properties = await getProperties(orgId);
  return <HomePageClient properties={properties} />;
}
```

---

## Applying this pattern to other features

1. Define types and mock data in `lib/data/[feature].ts`
2. For client widgets: `lib/hooks/use-[feature].ts` with `TODO(neon):` markers
3. Keep display formatting in `lib/format.ts`
4. Pure display components; wire pages through Server Components when possible

**Do not** use `convex/` or Convex hooks for new features — see [`AGENTS.md`](../AGENTS.md).

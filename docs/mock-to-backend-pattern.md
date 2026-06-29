# Mock-to-Backend Pattern

*Last updated: April 2026*

A standard method for building UI features with mock data that can be swapped to the real backend — **Neon (serverless Postgres) + Drizzle ORM** — with minimal code change. Data access lives in `lib/services/*` (one module per entity) and is called from Server Actions in `app/**/*.actions.ts`.

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
lib/hooks/use-[feature].ts     — data fetching + mutations (the swap point)
lib/format.ts                  — display formatting utilities
components/[feature].tsx       — pure display component, receives props
```

### 1. Types + Mock Data (`lib/data/[feature].ts`)

Define the data shape here. Mock data lives alongside the types so both can be replaced together.

**Rules:**
- Export the TypeScript types — components import from here, not from each other
- Store timestamps as `number` (Unix ms), never as pre-formatted strings like `"2m ago"`
- Include fields the backend will need even if the UI doesn't use them yet (e.g. `linkTo?`, `userId`)

```ts
// lib/data/notifications.ts

export type NotificationCategory = "MAINTENANCE" | "LEASING" | ...;

export interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: number;  // timestamp — format at render time
  read: boolean;
  linkTo?: string;    // future navigation
}

const now = Date.now();

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    category: "MAINTENANCE",
    title: "New maintenance request",
    description: "Unit 3B • Water leak reported in bathroom",
    createdAt: now - 2 * 60 * 1000,
    read: false,
  },
  // ...
];
```

### 2. The Hook (`lib/hooks/use-[feature].ts`)

This is the swap point — the only file that changes when the backend is ready.

Today it returns `useState` + mock data. When the Neon + Drizzle backend is wired, the mutation callbacks call **Server Actions** (which call `lib/services/*`), and the initial list is fetched server-side and passed in as a prop. The rest of the app doesn't change.

**Rules:**
- Mark `"use client"` — hooks are always client-side
- Leave `TODO(backend):` comments on every line that gets replaced
- Expose the same return shape regardless of whether data comes from mock or real backend
- Include all mutations the UI will need (e.g. `markAllRead`, `markAsRead`) even if some aren't used yet

```ts
// lib/hooks/use-notifications.ts
"use client";

import { useState } from "react";
import { MOCK_NOTIFICATIONS, type Notification } from "@/lib/data/notifications";

// TODO(backend): seed initial state from a Server Component prop (server-fetched
//   via lib/services/notifications.ts), and call Server Actions in the callbacks:
//   await markAllReadAction();
//   await markAsReadAction(id);

export function useNotifications(initial: Notification[] = MOCK_NOTIFICATIONS) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);

  function markAllRead() {
    // TODO(backend): await markAllReadAction()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markAsRead(id: string) {
    // TODO(backend): await markAsReadAction(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return { notifications, markAllRead, markAsRead };
}
```

**When wiring the backend**, the replacement looks like:

```ts
// lib/hooks/use-notifications.ts (after backend)
"use client";

import { useState } from "react";
import type { Notification } from "@/lib/data/notifications";
import { markAllReadAction, markAsReadAction } from "@/app/notifications/notifications.actions";

// `initial` comes from a Server Component that fetched via lib/services/notifications.ts.
export function useNotifications(initial: Notification[]) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); // optimistic
    await markAllReadAction();
  }

  async function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markAsReadAction(id);
  }

  return { notifications, markAllRead, markAsRead };
}
```

The component and its consumers are untouched.

The Server Actions the hook calls are thin — authenticate, validate, then delegate to the service:

```ts
// app/notifications/notifications.actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { notificationsService } from "@/lib/services/notifications";

export async function markAllReadAction() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  await notificationsService.markAllRead(userId);
  revalidateTag("notifications");
}

export async function markAsReadAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  await notificationsService.markAsRead(userId, id); // service enforces ownership
  revalidateTag("notifications");
}
```

```ts
// lib/services/notifications.ts — all Drizzle access for this entity lives here
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema/notifications";

export const notificationsService = {
  async listForUser(userId: string) {
    return db.select().from(notifications).where(eq(notifications.userId, userId));
  },

  async markAllRead(userId: string) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  },

  async markAsRead(userId: string, id: string) {
    // ownership check folded into the WHERE — IDOR defense
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  },
};
```

### 3. Display Formatting (`lib/format.ts`)

Formatting utilities that transform raw data (timestamps, numbers) into display strings. Never put these inside components.

```ts
// lib/format.ts

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
- No `useState` for server data
- No inline mock arrays
- Import types from `lib/data/[feature].ts`
- Import formatters from `lib/format.ts`
- Accept mutation callbacks as props (`onMarkAllRead`, `onMarkAsRead`)

```tsx
// components/layout/NotificationsPanel.tsx

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClose: () => void;
}
```

The consumer (e.g. `AppHeader`) calls the hook and passes results down:

```tsx
// components/layout/AppHeader.tsx

const { notifications, markAllRead } = useNotifications();

<NotificationsPanel
  notifications={notifications}
  onMarkAllRead={markAllRead}
  onClose={...}
/>
```

---

## Drizzle Schema

When the backend is ready, add the table to `lib/db/schema/notifications.ts`:

```ts
import { pgTable, text, bigint, boolean, index } from "drizzle-orm/pg-core";

export const notifications = pgTable(
  "notifications",
  {
    id:          text("id").primaryKey(),
    userId:      text("user_id").notNull(),       // Clerk userId — always filter by this
    category:    text("category").notNull(),      // "MAINTENANCE" | "LEASING" | ...
    title:       text("title").notNull(),
    description: text("description").notNull(),
    createdAt:   bigint("created_at", { mode: "number" }).notNull(), // Date.now()
    read:        boolean("read").notNull().default(false),
    linkTo:      text("link_to"),                 // nullable
  },
  (t) => ({ byUser: index("notifications_by_user").on(t.userId) })
);
```

Run `npm run db:generate` then `npm run db:migrate` to create the table in Neon.

---

## What Changes When the Backend Is Wired

| File | Change |
|---|---|
| `lib/hooks/use-notifications.ts` | Take `initial` from a prop; mutation callbacks call Server Actions |
| `app/notifications/notifications.actions.ts` | New file — Server Actions (auth + Zod, then call the service) |
| `lib/services/notifications.ts` | New file — Drizzle reads/writes (one module per entity) |
| `lib/db/schema/notifications.ts` | New file — Drizzle table definition |
| Server Component (e.g. page/layout) | Fetch the initial list via the service, pass as a prop |
| `lib/data/notifications.ts` | Remove `MOCK_NOTIFICATIONS` array, keep types |
| Everything else | No change |

---

## Applying This Pattern to Other Features

Follow the same four-layer structure for any feature that will eventually hit the backend:

1. Define types and mock data in `lib/data/[feature].ts`
2. Create `lib/hooks/use-[feature].ts` with `TODO(backend):` comments marking the swap points
3. Keep display formatting in `lib/format.ts`
4. Make the component a pure display component that receives props

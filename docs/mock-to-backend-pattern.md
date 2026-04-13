# Mock-to-Backend Pattern

*Last updated: April 2026*

A standard method for building UI features with mock data that can be swapped to a real backend (Convex) with minimal code change.

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

Today it returns `useState` + mock data. When Convex is wired, the `useState` lines become `useQuery` and `useMutation` calls. The rest of the app doesn't change.

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

// TODO(backend): Replace useState + MOCK_NOTIFICATIONS with:
//   const notifications = useQuery(api.notifications.list);
//   const markAllReadMutation = useMutation(api.notifications.markAllRead);
//   const markAsReadMutation  = useMutation(api.notifications.markAsRead);

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  function markAllRead() {
    // TODO(backend): markAllReadMutation()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markAsRead(id: string) {
    // TODO(backend): markAsReadMutation({ id })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return { notifications, markAllRead, markAsRead };
}
```

**When wiring Convex**, the replacement looks like:

```ts
// lib/hooks/use-notifications.ts (after backend)
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useNotifications() {
  const notifications = useQuery(api.notifications.list) ?? [];
  const markAllReadMutation = useMutation(api.notifications.markAllRead);
  const markAsReadMutation  = useMutation(api.notifications.markAsRead);

  return {
    notifications,
    markAllRead: () => markAllReadMutation(),
    markAsRead:  (id: string) => markAsReadMutation({ id }),
  };
}
```

The component and its consumers are untouched.

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

## Convex Schema

When the backend is ready, add the table to `convex/schema.ts`:

```ts
notifications: defineTable({
  userId:      v.string(),   // Clerk userId — always filter by this
  category:    v.union(v.literal("MAINTENANCE"), v.literal("LEASING"), ...),
  title:       v.string(),
  description: v.string(),
  createdAt:   v.number(),   // Date.now()
  read:        v.boolean(),
  linkTo:      v.optional(v.string()),
}).index("by_user", ["userId"]),
```

---

## What Changes When the Backend Is Wired

| File | Change |
|---|---|
| `lib/hooks/use-notifications.ts` | Swap `useState` → `useQuery` + `useMutation` |
| `convex/notifications.ts` | New file — Convex query + mutation functions |
| `convex/schema.ts` | Add `notifications` table |
| `lib/data/notifications.ts` | Remove `MOCK_NOTIFICATIONS` array, keep types |
| Everything else | No change |

---

## Applying This Pattern to Other Features

Follow the same four-layer structure for any feature that will eventually hit the backend:

1. Define types and mock data in `lib/data/[feature].ts`
2. Create `lib/hooks/use-[feature].ts` with `TODO(backend):` comments marking the swap points
3. Keep display formatting in `lib/format.ts`
4. Make the component a pure display component that receives props

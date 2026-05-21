# Plan — Phase 8.8: Notification Entity Wiring

## Context

The Notification entity has schema, db layer, server actions, a `useNotifications` hook, a `NotificationsPanel` component, and a bell button in `AppHeader` — all built. But the bell is non-functional because:

1. `useNotifications()` in `AppHeader` is called with no initial data — notifications always start as `[]`
2. The red dot badge is hardcoded (always visible)
3. Clicking a notification row does nothing — `linkTo` is stored but never navigated
4. Q5.T: `propertyId` is missing from the schema; property-scoping uses a fragile `linkTo` URL regex parse
5. NOTIF-0004 seed is property-scoped but has no `propertyId` or `linkTo`
6. "Manage notifications" footer button has no `onClick`

---

## Step 1 — Q5.T: Add `propertyId` to schema + fix seeds

**File:** `lib/data/types/notification.ts`

Add one optional field after `userId`, before `category`:
```ts
propertyId: z.string().optional(),
```

**Seeds to update:**

| Seed | Change |
|---|---|
| `NOTIF-0001/core.json` | Add `"propertyId": "PROP-0001"` (burst pipe at PP00016) |
| `NOTIF-0002/core.json` | Add `"propertyId": "PROP-0006"` (rent overdue Unit 2B) |
| `NOTIF-0003/core.json` | Add `"propertyId": "PROP-0011"` (lease offer at PROP-0011) |
| `NOTIF-0004/core.json` | Add `"propertyId": "PROP-0001"` + `"linkTo": "/property/PROP-0001/safety"` |
| `NOTIF-0005/core.json` | No change (portfolio-level, no property scope) |

**Update `notificationMatchesProperty()` in `app/(shell)/property/[id]/overview/queries.ts`:**

```ts
function notificationMatchesProperty(n: Notification, propertyId: string): boolean {
  if (n.propertyId) return n.propertyId === propertyId;
  if (!n.linkTo) return false;
  const match = n.linkTo.match(/^\/property\/([^/]+)\//);
  return match ? match[1] === propertyId : false;
}
```

---

## Step 2 — Create `NotificationsContext`

**File to create:** `components/layout/NotificationsContext.tsx`

Mirror the `AppHeaderPropertiesContext` pattern:

```tsx
"use client";
import { createContext, useContext } from "react";
import type { Notification } from "@/lib/data/types/notification";

const Context = createContext<Notification[]>([]);

export function NotificationsProvider({
  notifications,
  children,
}: {
  notifications: Notification[];
  children: React.ReactNode;
}) {
  return <Context.Provider value={notifications}>{children}</Context.Provider>;
}

export function useInitialNotifications(): Notification[] {
  return useContext(Context);
}
```

---

## Step 3 — Fetch notifications in shell layout

**File:** `app/(shell)/layout.tsx`

Add notification fetch alongside the existing properties fetch:

```tsx
import * as notificationsDb from "@/lib/data/db/notifications";
import { NotificationsProvider } from "@/components/layout/NotificationsContext";

const [properties, notifications] = await Promise.all([
  propertiesDb.list(userId),
  notificationsDb.list(userId),
]);

return (
  <ShellLayout>
    <NotificationsProvider notifications={notifications}>
      <AppHeaderProperties properties={slim}>
        {children}
      </AppHeaderProperties>
    </NotificationsProvider>
  </ShellLayout>
);
```

---

## Step 4 — Wire `AppHeader` to use initial notifications + fix badge

**File:** `components/layout/AppHeader.tsx`

```tsx
import { useInitialNotifications } from "./NotificationsContext";

const initialNotifications = useInitialNotifications();
const { notifications, markAllRead, markAsRead } = useNotifications(initialNotifications);
```

Fix hardcoded bell badge — replace the always-visible `<span>` with:
```tsx
{notifications.some((n) => !n.read) && (
  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
)}
```

Pass `onNotificationClick` to the panel:
```tsx
onNotificationClick={(n) => {
  markAsRead(n.id);
  if (n.linkTo) router.push(n.linkTo);
  panelRef.current?.close();
}}
```

---

## Step 5 — Wire notification click in `NotificationsPanel`

**File:** `components/layout/NotificationsPanel.tsx`

Add to props interface:
```ts
onNotificationClick: (notification: Notification) => void;
```

Add `onClick` to each notification row `<div>`:
```tsx
onClick={() => onNotificationClick(notification)}
```

Fix "Manage notifications" footer button:
```tsx
import { useRouter } from "next/navigation";
// inside component:
const router = useRouter();
// button onClick:
onClick={() => { router.push("/settings"); handleClose(); }}
```

---

## Step 6 — Add Zod validation to `markRead` server action

**File:** `lib/actions/notifications.actions.ts`

```ts
const MarkReadSchema = z.object({ id: z.string().min(1) });

export async function markRead(id: string): Promise<ActionResult<void>> {
  const result = MarkReadSchema.safeParse({ id });
  if (!result.success) return { ok: false, error: "Invalid input" };
  const userId = getCurrentUserId();
  await db.update(userId, result.data.id, { read: true } as Partial<Notification>);
  revalidateTag("notifications");
  return { ok: true, data: undefined };
}
```

---

## Files

| File | Action |
|---|---|
| `lib/data/types/notification.ts` | Add `propertyId: z.string().optional()` |
| `NOTIF-0001..0004/core.json` | Add propertyId (+ linkTo for 0004) |
| `app/(shell)/property/[id]/overview/queries.ts` | Update `notificationMatchesProperty()` |
| `app/(shell)/layout.tsx` | Fetch notifications + wrap with NotificationsProvider |
| `components/layout/NotificationsContext.tsx` | **CREATE** |
| `components/layout/AppHeader.tsx` | Use context, dynamic badge, pass onNotificationClick |
| `components/layout/NotificationsPanel.tsx` | Add onNotificationClick prop + row onClick + Manage button |
| `lib/actions/notifications.actions.ts` | Add Zod validation to markRead |

---

## Verification

1. Bell shows red dot (3 unread seeds: NOTIF-0001, 0002, 0005)
2. Click bell → panel opens, 5 notifications styled by category
3. Click "Mark all as read" → red dot disappears, rows dim
4. Click NOTIF-0001 (has linkTo) → navigates to `/property/PROP-0001/safety`, marks read
5. Click NOTIF-0005 (no linkTo) → marks read only, no navigation
6. `/property/PROP-0001/overview` alerts strip still shows NOTIF-0001 via `propertyId` field
7. `tsc --noEmit` passes

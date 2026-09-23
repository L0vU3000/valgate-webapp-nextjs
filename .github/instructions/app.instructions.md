---
applyTo: "app/**"
---

# App Router (`app/`)

Read `AGENTS.md` for stack and security rules. App-specific guidance:

- Default to **Server Components**. Add `"use client"` only at leaf components that need browser APIs or local state.
- Fetch initial data in Server Components — never `useEffect` for first load.
- One action file per domain (`*.actions.ts`). Server Actions call `lib/services/*` — never query Drizzle from components or route handlers.
- Always **`await params`** — it is a Promise in Next.js 15.
- `/api/v1/*` route handlers are the iOS integration surface. Do not invent endpoint shapes here without updating the API contract in this repo first.
- Add `loading.tsx` skeletons on data-heavy route segments.

# Next.js 15 App Router — Architecture Reference

*Last updated: April 2026 — Next.js 15 / React 19*

---

## Folder Structure

```
my-app/
├── app/                          # App Router root
│   ├── (marketing)/              # Route group — public pages
│   │   ├── page.tsx              # /
│   │   ├── about/
│   │   │   └── page.tsx          # /about
│   │   └── layout.tsx            # Shared marketing layout
│   │
│   ├── (app)/                    # Route group — authenticated app
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # /dashboard
│   │   │   └── loading.tsx
│   │   ├── settings/
│   │   │   └── page.tsx          # /settings
│   │   └── layout.tsx            # Auth-gated layout
│   │
│   ├── api/                      # API Route Handlers
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts
│   │
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # Global 404
│   ├── layout.tsx                # Root layout (html + body)
│   └── globals.css
│
├── components/
│   ├── ui/                       # Primitive / design-system components (shadcn/ui, Radix)
│   └── shared/                   # Composite components used app-wide
│       ├── navbar.tsx
│       ├── sidebar.tsx
│       └── footer.tsx
│
├── lib/
│   ├── db.ts                     # DB client
│   ├── auth.ts                   # Auth config
│   ├── validations.ts            # Shared Zod schemas
│   ├── rate-limit.ts             # Rate limiting (Upstash Redis)
│   └── utils.ts                  # cn(), formatDate(), etc.
│
├── hooks/                        # Client-side custom hooks
├── actions/                      # Server Actions — one file per domain
├── services/                     # External API / data-fetching logic
├── types/                        # Global TypeScript types
├── config/                       # App-wide constants (site, nav, plans)
│
├── docs/database/                # Postgres DDL prototype (Neon target)
│   └── prototype/schema.sql
├── lib/db.ts                     # Neon client (add when wired)
├── actions/                      # Server Actions — one file per domain
├── convex/                       # ⚠️ LEGACY — do not extend; migrating to Neon
│
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 1. Server vs. Client Components

Default to Server Components. Add `"use client"` only when necessary, and push it as far down the tree as possible — keep it at the leaf level.

| Situation | Use |
|---|---|
| Fetching data, accessing DB/secrets | Server Component (default) |
| `useState`, `useEffect`, event handlers | Client Component (`"use client"`) |
| Third-party libs that need `window` / browser APIs | Client Component |
| Wrapping a Server Component with context | Client Component boundary |

```tsx
// ✅ Server fetches, client only handles the interaction
// app/dashboard/page.tsx (Server)
import { LikeButton } from "@/components/shared/like-button"; // "use client"

export default async function DashboardPage() {
  const data = await fetchData();
  return <LikeButton initialCount={data.likes} />;
}
```

---

## 2. Data Fetching

Fetch directly in Server Components using `async/await`. Use `unstable_cache` for deduplication and tag-based revalidation. Prefer parallel fetching with `Promise.all`.

```ts
// lib/queries/posts.ts
import { unstable_cache } from "next/cache";

export const getPosts = unstable_cache(
  async (userId: string) => db.post.findMany({ where: { userId } }),
  ["user-posts"],
  { revalidate: 60, tags: ["posts"] }
);
```

```tsx
// Parallel fetching
const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
```

---

## 3. Action → Server Component → Client Component

The core loop for all data mutations. Three layers, each with one job.

```
User interaction
      ↓
Client Component  →  calls Server Action  →  validates + mutates DB + revalidateTag
                                                              ↓
Server Component  ←──── re-fetches fresh data from cache ────
      ↓
Passes updated data as props to Client Component
```

| Layer | Runs on | Responsible for |
|---|---|---|
| **Action** | Server only | Validation, DB writes, cache invalidation |
| **Server Component** | Server only | Reading data, passing props, no interactivity |
| **Client Component** | Browser | UI events, local state, calling actions |

**Layer 1 — Action**

```ts
// actions/post.actions.ts
"use server";

const Schema = z.object({ title: z.string().min(1).max(200).trim() });

export async function createPost(formData: FormData) {
  const parsed = Schema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  await db.post.create({ data: parsed.data });
  revalidateTag("posts"); // busts the cache → triggers Server Component re-fetch
  return { success: true };
}
```

**Layer 2 — Server Component**

```tsx
// app/dashboard/page.tsx
const getPosts = unstable_cache(
  async () => db.post.findMany(),
  ["all-posts"],
  { tags: ["posts"] } // matches revalidateTag("posts") above
);

export default async function DashboardPage() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

**Layer 3 — Client Component**

```tsx
// app/dashboard/_components/post-list.tsx
"use client";

export function PostList({ posts }: { posts: Post[] }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createPost(formData);
    if (!result.success) setError("Something went wrong");
    // On success: revalidateTag fires → Server Component re-renders → fresh props arrive
  }

  return (
    <div>
      {posts.map((post) => <div key={post.id}>{post.title}</div>)}
      <form action={handleSubmit}>
        <input name="title" />
        <button type="submit">Create</button>
      </form>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

---

## 4. Security

The server is your trust boundary. Everything crossing client → server is untrusted until validated. Everything crossing server → client is potentially public.

### 4.1 Client → Server

**Validate with Zod before touching the DB.**

```ts
// ❌ Raw FormData is unvalidated user input
await db.post.create({ data: { title: formData.get("title") as string } });

// ✅ Parse through Zod first
const parsed = Schema.safeParse({ title: formData.get("title") });
if (!parsed.success) return { success: false, error: parsed.error.flatten() };
```

**Authenticate AND authorize on every mutation.**

Authentication = who are you? Authorization = do you own this resource?

```ts
export async function deletePost(postId: string) {
  const session = await getServerSession();
  if (!session?.user) return { success: false, error: "Unauthenticated" };

  const post = await db.post.findUnique({ where: { id: postId } });

  // IDOR defense — always verify ownership before mutating
  if (post?.userId !== session.user.id) {
    return { success: false, error: "Forbidden" };
  }

  await db.post.delete({ where: { id: postId } });
  return { success: true };
}
```

> **IDOR (Insecure Direct Object Reference)** — a user manipulates a resource ID in the request to access or mutate someone else's data. The ownership check is the fix.

**Never leak internal errors to the client.**

```ts
// ❌ Exposes DB schema, table names, query structure
catch (err) { return { success: false, error: err.message }; }

// ✅ Log full error server-side, return a generic message
catch (err) {
  console.error("[createPost]", err);
  return { success: false, error: "Failed to create post" };
}
```

**Rate limit sensitive actions.**

```ts
export async function login(formData: FormData) {
  const ip = headers().get("x-forwarded-for") ?? "anonymous";
  const { success } = await rateLimit.check(ip, 5); // 5 attempts per window
  if (!success) return { success: false, error: "Too many attempts. Try again later." };
  // ...
}
```

---

### 4.2 Server → Client

**Select only the fields the UI needs — never send full DB objects.**

```tsx
// ❌ passwordHash, internalRole, etc. end up in the HTML payload
const user = await db.user.findUnique({ where: { id } });
return <ProfileCard user={user} />;

// ✅ Send only what the component renders
const user = await db.user.findUnique({
  where: { id },
  select: { name: true, email: true, avatarUrl: true },
});
return <ProfileCard user={user} />;
```

**Never pass secrets as props to Client Components.**

```tsx
// ❌ Secret is serialized into the page response
return <Component config={{ apiKey: process.env.OPENAI_API_KEY }} />;

// ✅ Use the secret server-side, pass only the output
const result = await callOpenAI(process.env.OPENAI_API_KEY);
return <Component summary={result.summary} />;
```

**`NEXT_PUBLIC_` inlines values into the browser bundle — secrets must never use it.**

```bash
# ✅ Server-only
DATABASE_URL="postgres://..."
STRIPE_SECRET_KEY="sk_live_..."

# ✅ Safe to expose
NEXT_PUBLIC_APP_URL="https://..."
NEXT_PUBLIC_STRIPE_PK="pk_live_..."

# ❌ Exposes secrets to anyone visiting the site
NEXT_PUBLIC_DATABASE_URL="postgres://..."
```

---

## 5. Route Groups

Use route groups to share layouts without affecting the URL, and to apply different auth guards per segment.

```
app/
  (auth)/
    login/page.tsx      → /login
    layout.tsx          → no auth check

  (app)/
    dashboard/page.tsx  → /dashboard
    layout.tsx          → auth guard ✅
```

---

## 6. Layouts & Loading UI

- Root layout (`app/layout.tsx`) must include `<html>` and `<body>`.
- Nested layouts only wrap their segment — keep them lean.
- Add `loading.tsx` (Suspense skeleton) for every data-heavy route segment.
- Add `error.tsx` with `"use client"` for per-segment error boundaries.

```tsx
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
```

---

## 7. Middleware

Runs on the Edge — keep it fast and lightweight. Use for auth redirects, locale detection, security headers. Never run DB queries here.

```ts
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get("token");
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

---

## 8. TypeScript Conventions

- `strict: true` in `tsconfig.json`.
- Central `types/index.ts` barrel for shared types.
- Type all Server Action return values explicitly.
- Always `await params` — it's a Promise in Next.js 15.

```tsx
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;
}
```

---

## 9. Environment Variables

Validate all env vars at startup. Never trust that they exist at runtime without a check.

```ts
// lib/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

---

## 10. Metadata

```tsx
// Static
export const metadata: Metadata = { title: "Dashboard", description: "..." };

// Dynamic
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title, description: post.excerpt };
}
```

---

## 11. Performance Checklist

- [ ] `next/image` for all images — no raw `<img>` tags
- [ ] `next/font` with `display: swap` for custom fonts
- [ ] `next/link` for all internal navigation
- [ ] `next/script` with `strategy="lazyOnload"` for non-critical third-party scripts
- [ ] `generateMetadata()` on every public-facing page
- [ ] PPR enabled for pages mixing static + dynamic content
- [ ] `Suspense` boundaries around slow data-fetching segments
- [ ] `revalidate` set on all cached queries — no unbounded static data

---

## 12. Neon + Clerk Notes

- **Database:** Neon PostgreSQL; schema prototype in `docs/database/prototype/schema.sql`.
- **Auth:** Clerk users + organizations; scope rows by `org_id` from the session, not from client input alone.
- **Reads:** async Server Components → `lib/data/*` or `lib/db` queries.
- **Writes:** Server Actions → Zod → `auth()` + org membership check → SQL → `revalidatePath` / `revalidateTag`.
- **Legacy:** `convex/` is deprecated — do not add Convex queries or `useQuery` for new features.

```ts
// actions/property.actions.ts
"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const createSchema = z.object({ name: z.string().min(1) });

export async function createProperty(input: unknown) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const { name } = createSchema.parse(input);
  // INSERT … WHERE org_id = orgId (resolve Clerk org → orgs.id)
  await db.property.create({ data: { orgId, name, createdBy: userId } });
}
```

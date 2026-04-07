# Curator — Implementation Plan (v2, post-review)

## Context

Building "Curator" from scratch: a calm Twitter/X feed reader where an admin curates named "playlists" of X accounts, and users subscribe to get a clean, metric-free feed. No likes, no retweet counts, no toxicity — just content.

**Repo**: `/Users/yahelraviv/curator` (empty, git initialized)
**Supabase project**: `cgttggkwzdixhsmmqwjv`

**Key decisions:**
- Data source: seeded data for MVP → Official X API Basic Plan ($100/mo, 10k reads/month) when live
- Curator: admin-only, determined by `users.is_admin = true` (set manually in SQL, NOT env var)
- UI: calm & minimal — bg `#FAFAF7`, text `#1A1A1A`, accent `#2563EB`, Inter font, `shadow-sm` cards
- Feed: infinite scroll (digest mode may be added later, not in MVP)
- MVP features: Auth, create/manage playlists (admin), subscribe + personal feed, discover page

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 15** (App Router, TypeScript) |
| Database + Auth | Supabase (`@supabase/ssr` — NOT deprecated auth-helpers) |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Package manager | pnpm |
| Validation | Zod (used in **every** Server Action) |
| Date formatting | date-fns |

---

## File Structure

```
curator/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx              # Navbar wrapper
│   │   ├── page.tsx                # Discover (public, no auth) — force-dynamic
│   │   ├── feed/page.tsx           # Personal feed (auth required) — force-dynamic
│   │   ├── playlists/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       └── playlists/
│   │           ├── new/page.tsx
│   │           └── [id]/edit/page.tsx
│   ├── actions/
│   │   ├── admin.ts                # assertAdmin() + playlist CRUD (Zod-validated)
│   │   └── subscriptions.ts        # subscribe/unsubscribe (Zod-validated)
│   └── api/
│       ├── auth/callback/route.ts  # OAuth + upserts user profile (eliminates trigger race)
│       └── tweets/sync/route.ts    # cron webhook for X API sync (Phase A)
├── components/
│   ├── ui/                         # shadcn components
│   ├── feed/
│   │   ├── TweetCard.tsx
│   │   ├── FeedList.tsx            # Client Component, cursor pagination
│   │   └── InfiniteScroll.tsx      # IntersectionObserver sentinel
│   ├── playlists/
│   │   ├── PlaylistCard.tsx
│   │   ├── PlaylistForm.tsx
│   │   └── AccountSearch.tsx
│   └── layout/
│       ├── Navbar.tsx              # Client Component
│       └── Sidebar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # createBrowserClient
│   │   ├── server.ts               # createServerClient (per-request, await cookies())
│   │   └── admin.ts                # service_role client — SERVER ONLY, never import in browser
│   ├── twitter/
│   │   ├── types.ts                # TweetData, CreatorAccount interfaces
│   │   ├── adapter.ts              # ITweetProvider interface
│   │   ├── seed-provider.ts        # reads from DB seed data (MVP)
│   │   ├── x-api-provider.ts       # Official X API v2 (Phase A, $100/mo)
│   │   └── index.ts                # getTweetProvider() factory
│   └── utils.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_feed_function.sql
│   └── seed.ts                     # idempotent seed script (--reset flag supported)
├── types/
│   └── database.ts                 # generated Supabase types
├── middleware.ts                    # session refresh + route protection
└── .env.local.example
```

---

## Database Schema (6 tables)

```sql
users          (id, auth_id → auth.users, email, username, name, avatar_url, is_admin)
playlists      (id, curator_id, name, slug, description, cover_emoji, is_public, created_at)
               -- NO subscriber_count column: computed on read via count(*), not denormalized
twitter_accounts (id, handle UNIQUE, display_name, bio, avatar_url, twitter_id, last_fetched_at)
playlist_accounts (playlist_id, twitter_account_id, added_at) -- junction, PK composite
playlist_subscriptions (user_id, playlist_id, is_active, subscribed_at) -- junction, PK composite
tweets         (id, twitter_account_id, twitter_id UNIQUE, text, media_urls JSONB, published_at)
               -- NO engagement metrics stored (no likes, retweet_count, reply_count)

-- Critical indexes:
CREATE INDEX ON tweets(published_at DESC, id DESC);         -- cursor pagination
CREATE INDEX ON playlist_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX ON playlists(is_public) WHERE is_public = true;
```

### Why no subscriber_count trigger
Premature optimization. A `count(*)` subquery or join is fine for MVP scale. Add denormalization only when measured to be slow.

### RLS Policy Summary

| Table | Anon | Auth User | Admin |
|-------|------|-----------|-------|
| twitter_accounts | SELECT | SELECT | ALL via service_role |
| playlists | SELECT (public only) | SELECT (public only) | INSERT/UPDATE/DELETE |
| playlist_accounts | SELECT (if playlist is public) | SELECT | ALL |
| playlist_subscriptions | — | SELECT/INSERT/UPDATE own rows | — |
| tweets | SELECT | SELECT | INSERT via service_role |
| users | — | SELECT/UPDATE own row | — |

---

## Feed RPC — Security Model (critical design decision)

```sql
-- supabase/migrations/002_feed_function.sql

-- SECURITY INVOKER (not DEFINER): RLS on all underlying tables remains active.
-- This provides defense-in-depth — even if there's a bug in this function,
-- the caller can only see rows their RLS policies allow.
-- Trade-off vs SECURITY DEFINER: planner has less freedom; acceptable at MVP scale.
-- If profiling shows slowness, switch to SECURITY DEFINER and add an explicit
-- WHERE clause matching auth.uid() as the sole gatekeeper.
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id uuid,
  p_limit   int          DEFAULT 20,
  p_cursor_date timestamptz DEFAULT NULL,
  p_cursor_id   uuid        DEFAULT NULL
)
RETURNS SETOF tweets
LANGUAGE sql STABLE
SECURITY INVOKER  -- intentional: RLS on tweets/subscriptions still applies
AS $$
  SELECT DISTINCT t.*
  FROM tweets t
  JOIN twitter_accounts ta  ON t.twitter_account_id = ta.id
  JOIN playlist_accounts pa ON ta.id = pa.twitter_account_id
  JOIN playlist_subscriptions ps ON pa.playlist_id = ps.playlist_id
  WHERE ps.user_id = p_user_id          -- explicit check (not just RLS)
    AND ps.is_active = true
    AND (
      p_cursor_date IS NULL
      OR t.published_at < p_cursor_date
      OR (t.published_at = p_cursor_date AND t.id < p_cursor_id)
    )
  ORDER BY t.published_at DESC, t.id DESC
  LIMIT p_limit;
$$;
```

**Deduplication**: `SELECT DISTINCT t.*` handles the case where a user subscribes to two playlists containing the same creator — the JOIN produces duplicate rows, DISTINCT collapses them. Since `twitter_id` is UNIQUE-constrained, there is only ever one DB row per tweet.

---

## Twitter Adapter Pattern

```
lib/twitter/adapter.ts         ITweetProvider interface
lib/twitter/seed-provider.ts   SeedProvider: reads from DB (MVP)
lib/twitter/x-api-provider.ts  XApiProvider: Official X API v2 (Phase A)
lib/twitter/index.ts           getTweetProvider() → TWEET_PROVIDER env var
```

### ITweetProvider interface

```typescript
interface ITweetProvider {
  fetchTweets(handle: string, options?: { since?: Date; limit?: number }): Promise<TweetData[]>
  fetchAccount(handle: string): Promise<CreatorAccount | null>
}
```

### Tweet Sync Roadmap (X API)

**Phase A — Official X API Basic ($100/mo)**
- 10,000 tweet reads/month cap → ~333/day → max ~14 accounts polled/hour at 1 tweet/request
- Strategy: Supabase cron Edge Function runs every 4 hours, fetches only accounts with active subscribers, uses `since: last_fetched_at` for incremental fetches (minimizes reads)
- Cache aggressively — UI always reads from local DB, never calls X API directly
- `XApiProvider.fetchTweets(handle, { since })` → X API v2 `GET /2/users/:id/tweets?start_time=...`

**Phase C — Official X API Pro ($5,000/mo)**
- Upgrade when revenue justifies it. Adapter swap: same interface, no UI changes.

**The sync job (`app/api/tweets/sync/route.ts`) is the ONLY consumer of XApiProvider.**
The feed page always reads from the `tweets` table. The provider is never called per-user-request.

---

## Implementation Phases

### Phase 1 — Scaffold (Next.js 15)
```bash
cd /Users/yahelraviv/curator
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm
# Verify: package.json shows "next": "15.x.x"
pnpm add @supabase/ssr @supabase/supabase-js zod lucide-react date-fns clsx tailwind-merge
pnpm add -D supabase tsx
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card badge avatar separator skeleton dialog sheet dropdown-menu form input label textarea toast switch
```

**Tailwind + shadcn color integration** (use CSS variables, not hardcoded utility classes):
```css
/* app/globals.css */
:root {
  --background: 250 250 247;    /* #FAFAF7 */
  --foreground: 26 26 26;       /* #1A1A1A */
  --accent: 37 99 235;          /* #2563EB */
}
```
Map these to `tailwind.config.ts` so shadcn components inherit the calm aesthetic automatically.

### Phase 2 — Database
- Write `001_initial_schema.sql` (tables, RLS, auto-create user trigger)
- Write `002_feed_function.sql` (get_user_feed RPC, SECURITY INVOKER, comments)
- `pnpm supabase link --project-ref cgttggkwzdixhsmmqwjv`
- `pnpm supabase db push`
- `pnpm supabase gen types typescript --project-id cgttggkwzdixhsmmqwjv > types/database.ts`

Add to `package.json`: `"db:types": "supabase gen types typescript --project-id cgttggkwzdixhsmmqwjv > types/database.ts"`

### Phase 3 — Supabase Clients + Middleware (Next.js 15 patterns)
- `lib/supabase/server.ts` — `await cookies()` (async in Next.js 15, unlike 14)
- `middleware.ts` — `auth.getUser()` NOT `getSession()` (server-round-trip validated)
- **Route protection**: `/feed` and `/admin/*` redirect to `/login` if no session

### Phase 4 — Auth + User Profile (eliminates trigger race)
`app/api/auth/callback/route.ts`:
```typescript
// After exchangeCodeForSession, immediately upsert user profile.
// This is the canonical user creation path — the DB trigger is a fallback.
await supabase.from('users').upsert({
  auth_id: user.id,
  email: user.email,
  username: generateUsername(user.email),
  name: user.user_metadata?.full_name ?? '',
  avatar_url: user.user_metadata?.avatar_url ?? null,
  is_admin: false,
}, { onConflict: 'auth_id', ignoreDuplicates: true })
```
The trigger remains as a backup for edge cases, but the callback is the primary path.

### Phase 5 — Twitter Adapter
- `ITweetProvider` interface
- `SeedProvider` (queries `tweets` table by handle, cursor-paginated)
- `XApiProvider` stub (throws "not implemented", clear TODO with API endpoint docs)
- `getTweetProvider()` factory

### Phase 6 — Seed Data
File: `supabase/seed.ts` — run with `pnpm tsx supabase/seed.ts [--reset]`

10 creator accounts → 4 playlists:
- **AI Researchers** 🧠: karpathy, ylecun, sama, geohot
- **Indie Hackers** 🚀: levelsio, marc_louvion
- **Philosophy & Ideas** 💡: naval, kk, paulg
- **Tech Founders** ⚡: sama, balajis, paulg

~5 seeded tweets per account. All upserts. `--reset` flag truncates first.

### Phase 7 — Auth Pages
- Login: email+password + Google OAuth
- Signup: email + confirmation state
- Both: centered card, `max-w-sm`, calm minimal design

### Phase 8 — Discover Page (Public)
- `app/(main)/page.tsx` with `export const dynamic = 'force-dynamic'`
- Server Component fetches public playlists with `count(*)` for subscriber count
- `<PlaylistCard />` grid: emoji, name, description, "N subscribers"

### Phase 9 — Feed Page (Infinite Scroll)
- `app/(main)/feed/page.tsx` with `export const dynamic = 'force-dynamic'`
- Server Component: fetch initial 20 tweets via `supabase.rpc('get_user_feed', ...)`
- `<FeedList />` — Client Component, manages cursor state `{ publishedAt, id }`
- `<InfiniteScroll />` — IntersectionObserver sentinel div at bottom
- `<TweetCard />` — avatar, display name, @handle, text, timestamp, optional images. **Zero metrics.**

### Phase 10 — Playlist Pages
- `/playlists` — browse all public playlists
- `/playlists/[slug]` — accounts list + tweet previews + subscribe button
- Subscribe button uses `useOptimistic` for instant UI feedback while Server Action resolves

### Phase 11 — Admin
- `/admin` — playlist list with edit/delete
- `/admin/playlists/new` + `/admin/playlists/[id]/edit`
- `assertAdmin()` in every admin Server Action:
  ```typescript
  async function assertAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthenticated')
    const { data: profile } = await supabase
      .from('users').select('is_admin').eq('auth_id', user.id).single()
    if (!profile?.is_admin) throw new Error('Forbidden')
    return user
  }
  ```

### Phase 12 — Zod Validation on All Server Actions
Every server action validates its input before touching the DB:
```typescript
// Example
const CreatePlaylistSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60),
  coverEmoji: z.string().emoji().optional(),
  isPublic: z.boolean().default(true),
})
export async function createPlaylist(input: unknown) {
  await assertAdmin()
  const data = CreatePlaylistSchema.parse(input) // throws on invalid
  // ...
}
```

---

## Critical Gotchas

1. **`getUser()` not `getSession()` in middleware** — `getSession()` reads cookie JWT without server verification. Security hole for protected routes.

2. **`await cookies()` in Next.js 15** — Unlike Next.js 14 where `cookies()` was sync, Next.js 15 makes it async. Always `await cookies()` in `server.ts`.

3. **Admin check is dual-layer** — Middleware redirects non-admins from `/admin/*`. Server Actions also call `assertAdmin()`. Never rely on middleware alone.

4. **Auth callback is the primary user creation path** — The DB trigger is a fallback. Upsert with `onConflict: 'auth_id', ignoreDuplicates: true` in the callback route.

5. **Service role client never in browser** — `lib/supabase/admin.ts` is server-only. Add an ESLint rule or comment: "DO NOT import in Client Components".

6. **`force-dynamic` on feed + discover** — App Router aggressively caches Server Components. Both pages must export `const dynamic = 'force-dynamic'`.

7. **RPC `SECURITY INVOKER` trade-off** — RLS applies as defense-in-depth. If query plan is too slow at scale, switch to `SECURITY DEFINER` + explicit `auth.uid()` check inside the function. See comment in `002_feed_function.sql`.

8. **Cursor is a tuple `(published_at, id)`** — Not just `published_at`. Two tweets in the same second require the `id` tiebreaker to avoid skips/duplicates.

9. **X API reads are shared quota** — At Basic tier ($100/mo), 10,000 reads/month ≈ 333/day. The cron job must only fetch accounts with active subscribers and always use `since: last_fetched_at` for incremental fetches. Log read counts.

---

## Verification Plan

1. `pnpm supabase db push` succeeds, `pnpm supabase db diff` shows no drift
2. `pnpm tsx supabase/seed.ts` runs twice without errors; `--reset` then re-seed works
3. `pnpm build` — zero TypeScript errors
4. Sign up → email → confirm → redirected to `/feed`. Profile row exists in `users` table immediately.
5. Google OAuth → callback → `/feed`. No trigger race errors.
6. Visit `/` unauthenticated → public playlists visible. No 401 errors.
7. Sign in → `/feed` → 20 tweets load. Scroll to bottom → next 20 load (different tweets, cursor works).
8. Subscribe to playlist → tweets appear in feed. Unsubscribe → disappear.
9. Subscribe to two playlists sharing a creator → no duplicate tweets in feed.
10. Login as admin → `/admin` accessible. Non-admin → redirected to `/`.
11. Create playlist, add accounts → visible on discover, appears in subscriber feeds.
12. **Verify zero metrics** — grep the rendered HTML for "like", "retweet", "follower" → should be empty.

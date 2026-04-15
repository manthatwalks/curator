-- ============================================================
-- CURATOR — Audit Fixes Migration
-- ============================================================
-- Addresses findings from architecture, database, and security audits:
--   1. Username collision in handle_new_user trigger (P0)
--   2. Feed RPC: DISTINCT -> EXISTS semi-join + ROW comparison (P1)
--   3. Centralized is_admin() function for RLS policies (P1)
--   4. RLS: admin visibility for private playlists (P1)
--   5. RLS: admin write policy on twitter_accounts (P1)
--   6. Partial index fix on playlist subscriptions (P2)
-- ============================================================


-- ============================================================
-- 1. FIX: Username collision in handle_new_user trigger
--
-- Problem: two users with email prefixes that collapse to the same
-- sanitized string (e.g. alice@gmail.com + alice@yahoo.com -> "alice")
-- caused an unhandled unique_violation, silently breaking sign-up.
--
-- Fix: retry with numeric suffix on collision, bounded to 5 attempts,
-- then fall back to uuid fragment.
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_base_username text;
  v_username      text;
  v_attempt       int := 0;
begin
  v_base_username := lower(
    regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'g')
  );
  -- Guard against empty prefix (e.g. "!!!@example.com")
  if v_base_username = '' then
    v_base_username := 'user';
  end if;

  v_username := v_base_username;

  loop
    begin
      insert into public.users (auth_id, email, username, name, avatar_url, is_admin)
      values (
        new.id,
        new.email,
        v_username,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        false
      )
      on conflict (auth_id) do nothing;
      -- Success (or auth_id already existed) -- exit loop
      return new;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        -- Fall back to uuid fragment for guaranteed uniqueness
        v_username := v_base_username || '_' || substr(new.id::text, 1, 8);
        insert into public.users (auth_id, email, username, name, avatar_url, is_admin)
        values (
          new.id, new.email, v_username,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'avatar_url', false
        )
        on conflict (auth_id) do nothing;
        return new;
      end if;
      v_username := v_base_username || v_attempt::text;
    end;
  end loop;
end;
$$;


-- ============================================================
-- 2. FIX: Feed RPC — EXISTS semi-join + ROW comparison
--
-- Problems:
--   a) SELECT DISTINCT t.* forces full-row sort/hash, defeating the
--      idx_tweets_published_at_id index for ORDER BY + LIMIT pushdown.
--   b) OR clause in cursor condition prevents composite index scan.
--
-- Fix:
--   a) EXISTS semi-join: short-circuits per tweet, no duplicates produced.
--   b) ROW comparison: (published_at, id) < (cursor_date, cursor_id)
--      enables composite index range scan.
--   c) Removes unnecessary twitter_accounts join (tweets.twitter_account_id
--      links directly to playlist_accounts.twitter_account_id).
-- ============================================================

create or replace function get_user_feed(
  p_user_id     uuid,
  p_limit       int         default 20,
  p_cursor_date timestamptz default null,
  p_cursor_id   uuid        default null
)
returns setof public.tweets
language sql stable
security invoker  -- intentional: RLS defense-in-depth (see 002 comments)
as $$
  select t.*
  from public.tweets t
  where exists (
    select 1
    from public.playlist_accounts pa
    join public.playlist_subscriptions ps on pa.playlist_id = ps.playlist_id
    where pa.twitter_account_id = t.twitter_account_id
      and ps.user_id   = p_user_id
      and ps.is_active = true
  )
  and (
    p_cursor_date is null
    or (t.published_at, t.id) < (p_cursor_date, p_cursor_id)
  )
  order by t.published_at desc, t.id desc
  limit p_limit;
$$;


-- ============================================================
-- 3. FIX: Centralized is_admin() function
--
-- Problem: every admin RLS policy repeats a correlated EXISTS subquery.
-- Fix: stable security-definer function, computed once per statement.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where auth_id = (select auth.uid()) and is_admin = true
  );
$$;

-- Partial index to speed up the admin lookup
create index if not exists idx_users_admin
  on public.users(auth_id)
  where is_admin = true;

-- Replace admin policies to use the centralized function

drop policy if exists "playlists_admin_insert" on public.playlists;
create policy "playlists_admin_insert"
  on public.playlists for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "playlists_admin_update" on public.playlists;
create policy "playlists_admin_update"
  on public.playlists for update
  to authenticated
  using (public.is_admin());

drop policy if exists "playlists_admin_delete" on public.playlists;
create policy "playlists_admin_delete"
  on public.playlists for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "playlist_accounts_admin_write" on public.playlist_accounts;
create policy "playlist_accounts_admin_write"
  on public.playlist_accounts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================
-- 4. FIX: Admin visibility for private playlists
--
-- Problem: playlists_public_read only shows is_public = true.
-- Admins querying via authenticated client cannot see private playlists,
-- breaking admin edit pages for private playlists.
-- ============================================================

drop policy if exists "playlists_public_read" on public.playlists;
create policy "playlists_read"
  on public.playlists for select
  to anon, authenticated
  using (is_public = true or public.is_admin());


-- ============================================================
-- 5. FIX: Admin write policy on twitter_accounts
--
-- Problem: admin actions (addAccountToPlaylist) use the authenticated
-- client to upsert twitter_accounts, but no RLS policy permits writes
-- for authenticated users. This caused silent RLS violations.
-- ============================================================

create policy "twitter_accounts_admin_write"
  on public.twitter_accounts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================
-- 6. FIX: Partial index on subscription playlist side
--
-- Problem: idx_subscriptions_playlist includes inactive rows,
-- growing unboundedly with subscription churn.
-- ============================================================

drop index if exists idx_subscriptions_playlist;
create index idx_subscriptions_playlist
  on public.playlist_subscriptions(playlist_id)
  where is_active = true;


-- ============================================================
-- Supporting index for the EXISTS semi-join in get_user_feed
-- ============================================================
create index if not exists idx_playlist_accounts_account_playlist
  on public.playlist_accounts(twitter_account_id, playlist_id);

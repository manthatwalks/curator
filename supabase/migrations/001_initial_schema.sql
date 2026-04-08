-- ============================================================
-- CURATOR — Initial Schema
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- Linked to Supabase Auth via auth_id.
-- is_admin is set manually via SQL for the site owner.
-- DO NOT use env vars for admin checks — use this column.
-- ============================================================
create table public.users (
  id          uuid primary key default uuid_generate_v4(),
  auth_id     uuid unique references auth.users(id) on delete cascade,
  email       text unique not null,
  username    text unique not null,
  name        text not null default '',
  avatar_url  text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.users is 'App-level user profiles linked to Supabase Auth. is_admin set manually in SQL.';

-- Auto-create profile row when a user signs up via Supabase Auth.
-- The /api/auth/callback route also upserts this as the primary path.
-- This trigger is a fallback for edge cases.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (auth_id, email, username, name, avatar_url, is_admin)
  values (
    new.id,
    new.email,
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'g')),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    false
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- TWITTER ACCOUNTS
-- Creators whose tweets are curated into playlists.
-- twitter_id is nullable — populated when real X API is used.
-- ============================================================
create table public.twitter_accounts (
  id              uuid primary key default uuid_generate_v4(),
  handle          text unique not null,   -- without @, e.g. "karpathy"
  display_name    text not null,
  bio             text,
  avatar_url      text,
  twitter_id      text unique,            -- X numeric ID (null for seeded data)
  last_fetched_at timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_twitter_accounts_handle on public.twitter_accounts(handle);

-- ============================================================
-- PLAYLISTS
-- Named, curated collections of Twitter accounts.
-- Only admins can create playlists (enforced via RLS + server actions).
-- subscriber_count is intentionally NOT stored — computed on read.
-- ============================================================
create table public.playlists (
  id           uuid primary key default uuid_generate_v4(),
  curator_id   uuid not null references public.users(id) on delete cascade,
  name         text not null,
  description  text,
  slug         text unique not null,
  cover_emoji  text not null default '📋',
  is_public    boolean not null default true,
  created_at   timestamptz not null default now(),

  constraint playlists_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create index idx_playlists_slug     on public.playlists(slug);
create index idx_playlists_curator  on public.playlists(curator_id);
create index idx_playlists_public   on public.playlists(is_public) where is_public = true;

-- ============================================================
-- PLAYLIST <-> ACCOUNT JUNCTION
-- Many-to-many: a playlist contains many accounts; an account
-- can appear in multiple playlists.
-- ============================================================
create table public.playlist_accounts (
  playlist_id        uuid not null references public.playlists(id) on delete cascade,
  twitter_account_id uuid not null references public.twitter_accounts(id) on delete cascade,
  added_at           timestamptz not null default now(),

  primary key (playlist_id, twitter_account_id)
);

create index idx_playlist_accounts_account on public.playlist_accounts(twitter_account_id);

-- ============================================================
-- PLAYLIST SUBSCRIPTIONS
-- Users subscribe to playlists to see them in their feed.
-- ============================================================
create table public.playlist_subscriptions (
  user_id       uuid not null references public.users(id) on delete cascade,
  playlist_id   uuid not null references public.playlists(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  is_active     boolean not null default true,

  primary key (user_id, playlist_id)
);

-- Partial index: only active subscriptions need fast lookup
create index idx_subscriptions_user    on public.playlist_subscriptions(user_id) where is_active = true;
create index idx_subscriptions_playlist on public.playlist_subscriptions(playlist_id);

-- ============================================================
-- TWEETS
-- Stored locally — the UI NEVER calls the X API directly.
-- The sync job (app/api/tweets/sync) populates this table.
-- For MVP: seed.ts populates this directly.
-- INTENTIONALLY NO engagement metrics (no likes, retweets, etc.)
-- ============================================================
create table public.tweets (
  id                 uuid primary key default uuid_generate_v4(),
  twitter_account_id uuid not null references public.twitter_accounts(id) on delete cascade,
  twitter_id         text unique not null,           -- dedup key; for seed data use "seed_<handle>_<n>"
  text               text not null,
  media_urls         jsonb not null default '[]'::jsonb,  -- string[] of image URLs
  published_at       timestamptz not null,
  fetched_at         timestamptz not null default now()
  -- NO: like_count, retweet_count, reply_count, quote_count, impression_count
);

-- The critical index for cursor-based feed pagination
create index idx_tweets_published_at_id
  on public.tweets(published_at desc, id desc);

-- For fetching tweets per account during sync
create index idx_tweets_account_published
  on public.tweets(twitter_account_id, published_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.twitter_accounts enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_accounts enable row level security;
alter table public.playlist_subscriptions enable row level security;
alter table public.tweets enable row level security;

-- USERS: read/update own row only
create policy "users_select_own"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = auth_id);

create policy "users_update_own"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = auth_id)
  with check ((select auth.uid()) = auth_id);

-- TWITTER ACCOUNTS: public read; writes via service_role (admin actions, cron)
create policy "twitter_accounts_public_read"
  on public.twitter_accounts for select
  to anon, authenticated
  using (true);

-- PLAYLISTS: public playlists readable by anyone; admin writes
create policy "playlists_public_read"
  on public.playlists for select
  to anon, authenticated
  using (is_public = true);

create policy "playlists_admin_insert"
  on public.playlists for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users
      where auth_id = (select auth.uid()) and is_admin = true
    )
  );

create policy "playlists_admin_update"
  on public.playlists for update
  to authenticated
  using (
    exists (
      select 1 from public.users
      where auth_id = (select auth.uid()) and is_admin = true
    )
  );

create policy "playlists_admin_delete"
  on public.playlists for delete
  to authenticated
  using (
    exists (
      select 1 from public.users
      where auth_id = (select auth.uid()) and is_admin = true
    )
  );

-- PLAYLIST ACCOUNTS: readable if playlist is public; admin writes
create policy "playlist_accounts_public_read"
  on public.playlist_accounts for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.playlists
      where id = playlist_id and is_public = true
    )
  );

create policy "playlist_accounts_admin_write"
  on public.playlist_accounts for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where auth_id = (select auth.uid()) and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where auth_id = (select auth.uid()) and is_admin = true
    )
  );

-- PLAYLIST SUBSCRIPTIONS: users manage their own
create policy "subscriptions_select_own"
  on public.playlist_subscriptions for select
  to authenticated
  using (
    user_id = (
      select id from public.users where auth_id = (select auth.uid())
    )
  );

create policy "subscriptions_insert_own"
  on public.playlist_subscriptions for insert
  to authenticated
  with check (
    user_id = (
      select id from public.users where auth_id = (select auth.uid())
    )
  );

create policy "subscriptions_update_own"
  on public.playlist_subscriptions for update
  to authenticated
  using (
    user_id = (
      select id from public.users where auth_id = (select auth.uid())
    )
  );

-- TWEETS: public read; service_role inserts (cron/seed)
create policy "tweets_public_read"
  on public.tweets for select
  to anon, authenticated
  using (true);

create policy "tweets_service_insert"
  on public.tweets for insert
  to service_role
  with check (true);

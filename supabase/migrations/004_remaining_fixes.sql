-- ============================================================
-- CURATOR — Remaining Audit Fixes
-- ============================================================
-- 1. Migrate media_urls from JSONB to text[]
-- 2. API usage tracking table for X API budget
-- 3. Subscription cleanup function
-- ============================================================


-- ============================================================
-- 1. Migrate media_urls from JSONB to text[]
--
-- Rationale: media_urls is always a string array. Using text[]
-- gives native array operations, correct typing in generated
-- client types, and eliminates runtime JSON parsing.
-- ============================================================

alter table public.tweets
  alter column media_urls type text[]
  using case
    when media_urls is null or media_urls = 'null'::jsonb then '{}'::text[]
    when jsonb_typeof(media_urls) = 'array' and jsonb_array_length(media_urls) > 0
      then array(select jsonb_array_elements_text(media_urls))
    else '{}'::text[]
  end;

alter table public.tweets
  alter column media_urls set default '{}';


-- ============================================================
-- 2. API usage tracking for X API budget
--
-- Simple period-based counter. Period is YYYY-MM-01 string
-- so monthly aggregation is trivial. Upsert-safe.
-- ============================================================

create table if not exists public.api_usage (
  period     text primary key,  -- 'YYYY-MM-01'
  read_count int  not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.api_usage is 'Monthly X API read budget tracker. One row per calendar month.';

-- Only service_role writes; admins can read
alter table public.api_usage enable row level security;

create policy "api_usage_admin_read"
  on public.api_usage for select
  to authenticated
  using (public.is_admin());

create policy "api_usage_service_write"
  on public.api_usage for all
  to service_role
  using (true)
  with check (true);


-- ============================================================
-- 3. Subscription cleanup function
--
-- Hard-deletes inactive subscriptions older than the specified
-- retention period. Called by the cleanup cron job.
-- ============================================================

create or replace function public.cleanup_stale_subscriptions(
  p_retention_days int default 90
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  delete from public.playlist_subscriptions
  where is_active = false
    and subscribed_at < now() - (p_retention_days || ' days')::interval
  ;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.cleanup_stale_subscriptions is
  'Hard-deletes inactive subscriptions older than p_retention_days (default 90).';

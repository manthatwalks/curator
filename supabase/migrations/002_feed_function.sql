-- ============================================================
-- CURATOR — Feed RPC Function
-- ============================================================
--
-- get_user_feed: Returns paginated tweets for a user's personal feed.
--
-- Security model: SECURITY INVOKER (intentional)
--   - RLS on all underlying tables (tweets, playlist_subscriptions) remains active
--   - Provides defense-in-depth: bugs in this function cannot leak cross-user data
--   - Trade-off: query planner has less freedom than SECURITY DEFINER
--   - If profiling shows slowness at scale, switch to SECURITY DEFINER and add
--     an explicit auth.uid() check as the sole gatekeeper.
--
-- Deduplication: SELECT DISTINCT handles users subscribed to multiple playlists
-- that share the same creator — the JOIN produces duplicate rows, DISTINCT collapses them.
--
-- Cursor: composite (published_at, id) — NOT just published_at.
-- Two tweets published in the same second need the id tiebreaker to avoid
-- skips or duplicates when paginating.
-- ============================================================

create or replace function get_user_feed(
  p_user_id    uuid,
  p_limit      int         default 20,
  p_cursor_date timestamptz default null,
  p_cursor_id  uuid        default null
)
returns setof public.tweets
language sql stable
security invoker  -- intentional: see comment above
as $$
  select distinct t.*
  from public.tweets t
  join public.twitter_accounts ta  on t.twitter_account_id = ta.id
  join public.playlist_accounts pa on ta.id = pa.twitter_account_id
  join public.playlist_subscriptions ps on pa.playlist_id = ps.playlist_id
  where ps.user_id = p_user_id           -- explicit filter (not just relying on RLS)
    and ps.is_active = true
    and (
      p_cursor_date is null
      or t.published_at < p_cursor_date
      or (t.published_at = p_cursor_date and t.id < p_cursor_id)
    )
  order by t.published_at desc, t.id desc
  limit p_limit;
$$;

-- Grant execute to authenticated users (RLS on underlying tables still applies)
grant execute on function get_user_feed(uuid, int, timestamptz, uuid) to authenticated;

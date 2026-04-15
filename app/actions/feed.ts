"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthProfile } from "@/lib/supabase/auth";
import type { TweetCardData } from "@/components/feed/TweetCard";

export interface FeedCursor {
  publishedAt: string;
  id: string;
}

export interface FeedPageResult {
  tweets: TweetCardData[];
  nextCursor: FeedCursor | null;
}

/**
 * Fetch one page of the authenticated user's personal feed.
 * Auth is validated server-side — the client never passes a userId.
 */
export async function getFeedPage(
  cursor?: FeedCursor
): Promise<FeedPageResult> {
  const profile = await requireAuthProfile();
  const supabase = await createClient();

  const LIMIT = 20;

  const { data: tweets, error } = await supabase.rpc("get_user_feed", {
    p_user_id: profile.id,
    p_limit: LIMIT,
    p_cursor_date: cursor?.publishedAt ?? null,
    p_cursor_id: cursor?.id ?? null,
  });

  if (error) throw new Error(`Feed query failed: ${error.message}`);
  if (!tweets || tweets.length === 0) {
    return { tweets: [], nextCursor: null };
  }

  // Batch-fetch author data for all tweets in this page
  const accountIds = [...new Set(tweets.map((t) => t.twitter_account_id))];
  const { data: accounts } = await supabase
    .from("twitter_accounts")
    .select("id, handle, display_name, avatar_url")
    .in("id", accountIds);

  const accountMap = new Map(
    (accounts ?? []).map((a) => [
      a.id,
      {
        handle: a.handle,
        display_name: a.display_name,
        avatar_url: a.avatar_url,
      },
    ])
  );

  const enriched: TweetCardData[] = tweets.map((t) => ({
    id: t.id,
    text: t.text,
    media_urls: t.media_urls ?? [],
    published_at: t.published_at,
    twitter_accounts: accountMap.get(t.twitter_account_id) ?? {
      handle: "unknown",
      display_name: "Unknown",
      avatar_url: null,
    },
  }));

  // Cursor is the last item — composite (published_at, id) for stable pagination
  const last = tweets[tweets.length - 1];
  const nextCursor: FeedCursor | null =
    tweets.length === LIMIT
      ? { publishedAt: last.published_at, id: last.id }
      : null;

  return { tweets: enriched, nextCursor };
}

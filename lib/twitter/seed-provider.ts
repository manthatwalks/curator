// SERVER-ONLY — uses the admin client (bypasses RLS)
import type { ITweetProvider } from "./adapter";
import type {
  CreatorAccount,
  FetchTweetsOptions,
  FetchTweetsResult,
  TweetData,
} from "./types";
import { createAdminClient } from "@/lib/supabase/admin";

function encodeCursor(publishedAt: string, id: string): string {
  return Buffer.from(`${publishedAt}|${id}`).toString("base64");
}

function decodeCursor(cursor: string): { publishedAt: string; id: string } {
  const decoded = Buffer.from(cursor, "base64").toString("utf-8");
  const [publishedAt, id] = decoded.split("|");
  return { publishedAt, id };
}

export class SeedProvider implements ITweetProvider {
  async fetchTweets(
    handle: string,
    options?: FetchTweetsOptions
  ): Promise<FetchTweetsResult> {
    const supabase = createAdminClient();
    const limit = options?.limit ?? 20;
    const cleanHandle = handle.replace(/^@/, "");

    // Look up the account
    const { data: account } = await supabase
      .from("twitter_accounts")
      .select("id, handle, display_name, bio, avatar_url")
      .eq("handle", cleanHandle)
      .single();

    if (!account) return { tweets: [], nextCursor: null };

    let query = supabase
      .from("tweets")
      .select("id, twitter_id, text, media_urls, published_at")
      .eq("twitter_account_id", account.id)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    // Apply cursor
    if (options?.cursor) {
      const { publishedAt, id } = decodeCursor(options.cursor);
      query = query.or(
        `published_at.lt.${publishedAt},and(published_at.eq.${publishedAt},id.lt.${id})`
      );
    }

    // Apply since (for incremental syncs)
    if (options?.since) {
      query = query.gte("published_at", options.since.toISOString());
    }

    const { data: rows, error } = await query;

    if (error || !rows) return { tweets: [], nextCursor: null };

    const author: CreatorAccount = {
      id: account.id,
      handle: account.handle,
      displayName: account.display_name,
      bio: account.bio,
      avatarUrl: account.avatar_url,
    };

    const tweets: TweetData[] = rows.map((row) => ({
      twitterId: row.twitter_id,
      text: row.text,
      mediaUrls: Array.isArray(row.media_urls) ? (row.media_urls as string[]) : [],
      publishedAt: new Date(row.published_at),
      author,
    }));

    const lastRow = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && lastRow
        ? encodeCursor(lastRow.published_at, lastRow.id)
        : null;

    return { tweets, nextCursor };
  }

  async fetchAccount(handle: string): Promise<CreatorAccount | null> {
    const supabase = createAdminClient();
    const cleanHandle = handle.replace(/^@/, "");

    const { data } = await supabase
      .from("twitter_accounts")
      .select("id, handle, display_name, bio, avatar_url")
      .eq("handle", cleanHandle)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      handle: data.handle,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
    };
  }
}

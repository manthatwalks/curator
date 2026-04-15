import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTweetProvider, RateLimitError, BudgetExceededError } from "@/lib/twitter";
import { recordReads, getBudget } from "@/lib/twitter/budget";

interface SyncResult {
  handle: string;
  tweetsUpserted: number;
  readsConsumed: number;
  error?: string;
}

/**
 * Cron job: sync tweets from X API for accounts with active subscribers.
 * Scheduled every 4 hours via vercel.json.
 *
 * Prioritizes accounts by last_fetched_at (oldest first) to ensure fair rotation.
 * Tracks API reads against the monthly budget (Basic tier: 10k reads/month).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = getTweetProvider();
  const supabase = createAdminClient();

  // Check remaining budget before starting
  const budget = await getBudget();
  if (budget.remaining <= 0) {
    return NextResponse.json({
      message: "Monthly API budget exhausted",
      budget,
      results: [],
    });
  }

  // Find accounts with active subscribers, prioritized by staleness
  const { data: accounts, error: queryError } = await supabase
    .from("twitter_accounts")
    .select(
      `id, handle, last_fetched_at,
       playlist_accounts!inner(
         playlist_id,
         playlists!inner(
           id,
           playlist_subscriptions!inner(is_active)
         )
       )`
    )
    .order("last_fetched_at", { ascending: true, nullsFirst: true });

  if (queryError) {
    return NextResponse.json(
      { error: `Account query failed: ${queryError.message}` },
      { status: 500 }
    );
  }

  // Deduplicate (an account can appear in multiple playlists)
  const uniqueAccounts = new Map<string, { id: string; handle: string; lastFetchedAt: string | null }>();
  for (const acc of accounts ?? []) {
    if (!uniqueAccounts.has(acc.id)) {
      uniqueAccounts.set(acc.id, {
        id: acc.id,
        handle: acc.handle,
        lastFetchedAt: acc.last_fetched_at,
      });
    }
  }

  const results: SyncResult[] = [];
  let totalReads = 0;

  for (const account of uniqueAccounts.values()) {
    // Stop if budget would be exceeded
    if (totalReads + 100 > budget.remaining) {
      break;
    }

    const result: SyncResult = {
      handle: account.handle,
      tweetsUpserted: 0,
      readsConsumed: 0,
    };

    try {
      const fetchResult = await provider.fetchTweets(account.handle, {
        since: account.lastFetchedAt
          ? new Date(account.lastFetchedAt)
          : undefined,
        limit: 100,
      });

      result.readsConsumed = fetchResult.readsConsumed;
      totalReads += fetchResult.readsConsumed;

      // Upsert tweets (twitter_id is unique — deduplication is automatic)
      for (const tweet of fetchResult.tweets) {
        const { error: upsertError } = await supabase
          .from("tweets")
          .upsert(
            {
              twitter_account_id: account.id,
              twitter_id: tweet.twitterId,
              text: tweet.text,
              media_urls: tweet.mediaUrls,
              published_at: tweet.publishedAt.toISOString(),
            },
            { onConflict: "twitter_id" }
          );

        if (!upsertError) {
          result.tweetsUpserted += 1;
        }
      }

      // Update last_fetched_at
      await supabase
        .from("twitter_accounts")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", account.id);
    } catch (err) {
      if (err instanceof RateLimitError) {
        result.error = `Rate limited until ${err.retryAfter.toISOString()}`;
        break; // Stop syncing — all endpoints share the rate limit
      }
      if (err instanceof BudgetExceededError) {
        result.error = err.message;
        break;
      }
      result.error = err instanceof Error ? err.message : "Unknown error";
    }

    results.push(result);
  }

  // Record total reads consumed
  if (totalReads > 0) {
    await recordReads(totalReads);
  }

  // Revalidate feed pages so users see new tweets
  revalidatePath("/feed");

  return NextResponse.json({
    accountsSynced: results.filter((r) => !r.error).length,
    totalTweetsUpserted: results.reduce((sum, r) => sum + r.tweetsUpserted, 0),
    totalReadsConsumed: totalReads,
    budgetRemaining: budget.remaining - totalReads,
    results,
  });
}

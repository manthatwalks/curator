// Stub — will be wired to XApiProvider when TWEET_PROVIDER=xapi
// Called by a Supabase cron Edge Function via POST with Authorization header.
// The sync job is the ONLY consumer of XApiProvider — the UI always reads from the DB.

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO (Phase A — X API Basic): Implement sync logic
  // 1. Query twitter_accounts with active subscribers
  // 2. For each account: getTweetProvider().fetchTweets(handle, { since: last_fetched_at })
  // 3. Upsert into tweets table (twitter_id is unique — deduplication is automatic)
  // 4. Update twitter_accounts.last_fetched_at
  // 5. Log read count (Basic tier: 10k reads/month budget)

  return NextResponse.json(
    { message: "Sync not yet implemented. Set TWEET_PROVIDER=seed for MVP." },
    { status: 501 }
  );
}

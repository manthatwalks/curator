export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeedPage } from "@/app/actions/feed";
import FeedList from "@/components/feed/FeedList";
import Link from "next/link";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/feed");

  // Fetch the first page server-side for instant render (no loading flash)
  let initialTweets: Awaited<ReturnType<typeof getFeedPage>>["tweets"] = [];
  let initialCursor: Awaited<ReturnType<typeof getFeedPage>>["nextCursor"] = null;

  try {
    const result = await getFeedPage();
    initialTweets = result.tweets;
    initialCursor = result.nextCursor;
  } catch {
    // Non-fatal — FeedList will show empty state
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Your feed</h1>
        {initialTweets.length === 0 && (
          <Link
            href="/playlists"
            className="text-sm text-primary font-medium hover:underline"
          >
            Browse playlists →
          </Link>
        )}
      </div>

      <FeedList
        initialTweets={initialTweets}
        initialCursor={initialCursor}
      />
    </div>
  );
}

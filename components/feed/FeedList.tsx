"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { getFeedPage, type FeedCursor } from "@/app/actions/feed";
import TweetCard, { type TweetCardData } from "./TweetCard";
import InfiniteScroll from "./InfiniteScroll";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedListProps {
  initialTweets: TweetCardData[];
  initialCursor: FeedCursor | null;
}

export default function FeedList({
  initialTweets,
  initialCursor,
}: FeedListProps) {
  const [tweets, setTweets] = useState<TweetCardData[]>(initialTweets);
  const [cursor, setCursor] = useState<FeedCursor | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    setError(null);

    try {
      const result = await getFeedPage(cursor);
      setTweets((prev) => [...prev, ...result.tweets]);
      setCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  if (tweets.length === 0) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-lg text-muted-foreground">Your feed is empty.</p>
        <p className="text-sm text-muted-foreground">
          Subscribe to playlists on the{" "}
          <Link href="/discover" className="text-primary hover:underline">
            Discover
          </Link>{" "}
          page to start seeing content here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}

      {loading && <FeedSkeleton count={3} />}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-center">
          {error} —{" "}
          <button
            onClick={loadMore}
            className="underline underline-offset-2 font-medium"
          >
            retry
          </button>
        </div>
      )}

      {cursor && !loading && (
        <InfiniteScroll
          onLoadMore={loadMore}
          hasMore={cursor !== null}
          loading={loading}
        />
      )}

      {!cursor && tweets.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          You&apos;re all caught up.
        </p>
      )}
    </div>
  );
}

function FeedSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </>
  );
}

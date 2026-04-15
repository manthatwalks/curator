export const revalidate = 60;

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractCount } from "@/lib/supabase/count";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TweetCard from "@/components/feed/TweetCard";
import PlaylistSubscribeSection from "@/components/playlists/PlaylistSubscribeSection";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PlaylistDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Fetch playlist + accounts in one query
  const { data: playlist } = await supabase
    .from("playlists")
    .select(
      `id, name, description, cover_emoji, is_public,
       playlist_accounts(
         twitter_account_id,
         twitter_accounts(id, handle, display_name, bio, avatar_url)
       ),
       playlist_subscriptions(count)`
    )
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!playlist) notFound();

  const accounts = (playlist.playlist_accounts ?? [])
    .map((pa) => pa.twitter_accounts)
    .filter(Boolean) as {
    id: string;
    handle: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
  }[];

  const subscriberCount = extractCount(playlist.playlist_subscriptions);

  // Fetch recent tweets from each account in the playlist (preview, 3 per account)
  const accountIds = accounts.map((a) => a.id);
  const { data: tweets } = await supabase
    .from("tweets")
    .select("id, text, media_urls, published_at, twitter_account_id")
    .in("twitter_account_id", accountIds.length ? accountIds : ["none"])
    .order("published_at", { ascending: false })
    .limit(15);

  // Build account map for tweet enrichment
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const enrichedTweets = (tweets ?? []).map((t) => ({
    id: t.id,
    text: t.text,
    media_urls: Array.isArray(t.media_urls) ? (t.media_urls as string[]) : [],
    published_at: t.published_at,
    twitter_accounts: accountMap.get(t.twitter_account_id) ?? {
      handle: "unknown",
      display_name: "Unknown",
      avatar_url: null,
    },
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{playlist.cover_emoji}</span>
            <h1 className="text-2xl font-semibold tracking-tight">
              {playlist.name}
            </h1>
          </div>
          {playlist.description && (
            <p className="text-muted-foreground max-w-xl">{playlist.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {subscriberCount}{" "}
            {subscriberCount === 1 ? "follower" : "followers"} ·{" "}
            {accounts.length} {accounts.length === 1 ? "creator" : "creators"}
          </p>
        </div>

        <PlaylistSubscribeSection playlistId={playlist.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creators sidebar */}
        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Creators
          </h2>
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage
                    src={account.avatar_url ?? undefined}
                    alt={account.display_name}
                  />
                  <AvatarFallback className="text-xs">
                    {account.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {account.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{account.handle}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Recent tweets */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent posts
          </h2>
          {enrichedTweets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No posts yet.
            </p>
          ) : (
            enrichedTweets.map((tweet) => (
              <TweetCard key={tweet.id} tweet={tweet} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

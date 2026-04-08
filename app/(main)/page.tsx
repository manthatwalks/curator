export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import PlaylistCard from "@/components/playlists/PlaylistCard";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function DiscoverPage() {
  const supabase = await createClient();

  // Fetch public playlists with subscriber + account counts
  const { data: playlists } = await supabase
    .from("playlists")
    .select(
      `
      id, name, slug, description, cover_emoji,
      playlist_subscriptions(count),
      playlist_accounts(count)
    `
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  // Check auth to show subscribed state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscribedIds = new Set<string>();
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();
    if (profile) {
      const { data: subs } = await supabase
        .from("playlist_subscriptions")
        .select("playlist_id")
        .eq("user_id", profile.id)
        .eq("is_active", true);
      subscribedIds = new Set((subs ?? []).map((s) => s.playlist_id));
    }
  }

  const playlistsWithCounts = (playlists ?? []).map((p) => ({
    ...p,
    subscriberCount: Array.isArray(p.playlist_subscriptions)
      ? (p.playlist_subscriptions[0] as unknown as { count: number } | undefined)?.count ?? 0
      : 0,
    accountCount: Array.isArray(p.playlist_accounts)
      ? (p.playlist_accounts[0] as unknown as { count: number } | undefined)?.count ?? 0
      : 0,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="mb-10 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Curated feeds, not algorithms
        </h1>
        <p className="text-muted-foreground max-w-lg">
          Follow playlists of creators you trust. Get a clean, calm feed —
          no likes, no retweets, no noise.
        </p>
        {!user && (
          <div className="flex gap-3 pt-2">
            <Link href="/signup" className={buttonVariants()}>
              Get started
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </div>
        )}
      </div>

      {/* Playlists grid */}
      {playlistsWithCounts.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">No playlists yet.</p>
          <p className="text-sm mt-1">Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlistsWithCounts.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              isSubscribed={subscribedIds.has(playlist.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

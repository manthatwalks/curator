export const revalidate = 60;

import { createPublicClient } from "@/lib/supabase/public";
import { extractCount } from "@/lib/supabase/count";
import PlaylistGridWithSubs from "@/components/playlists/PlaylistGridWithSubs";
import AuthAwareCTA from "@/components/playlists/AuthAwareCTA";

export default async function DiscoverPage() {
  const supabase = createPublicClient();

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

  const enriched = (playlists ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    cover_emoji: p.cover_emoji,
    subscriberCount: extractCount(p.playlist_subscriptions),
    accountCount: extractCount(p.playlist_accounts),
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
        <AuthAwareCTA />
      </div>

      {/* Playlists grid */}
      {enriched.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">No playlists yet.</p>
          <p className="text-sm mt-1">Check back soon.</p>
        </div>
      ) : (
        <PlaylistGridWithSubs playlists={enriched} />
      )}
    </div>
  );
}

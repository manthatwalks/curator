export const revalidate = 60;

import { createPublicClient } from "@/lib/supabase/public";
import { extractCount } from "@/lib/supabase/count";
import PlaylistGridWithSubs from "@/components/playlists/PlaylistGridWithSubs";

interface PlaylistData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_emoji: string;
  subscriberCount: number;
  accountCount: number;
}

async function fetchPlaylists(): Promise<PlaylistData[]> {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("playlists")
      .select(
        `id, name, slug, description, cover_emoji,
         playlist_subscriptions(count),
         playlist_accounts(count)`
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      cover_emoji: p.cover_emoji,
      subscriberCount: extractCount(p.playlist_subscriptions),
      accountCount: extractCount(p.playlist_accounts),
    }));
  } catch {
    return [];
  }
}

export default async function PlaylistsPage() {
  const playlists = await fetchPlaylists();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">All playlists</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Curated collections of creators worth following.
        </p>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No playlists yet — check back soon.
        </div>
      ) : (
        <PlaylistGridWithSubs playlists={playlists} />
      )}
    </div>
  );
}

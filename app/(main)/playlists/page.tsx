export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import PlaylistCard from "@/components/playlists/PlaylistCard";

export default async function PlaylistsPage() {
  const supabase = await createClient();

  const { data: playlists } = await supabase
    .from("playlists")
    .select(
      `id, name, slug, description, cover_emoji,
       playlist_subscriptions(count),
       playlist_accounts(count)`
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

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

  const enriched = (playlists ?? []).map((p) => ({
    ...p,
    subscriberCount:
      (p.playlist_subscriptions?.[0] as unknown as { count: number } | undefined)
        ?.count ?? 0,
    accountCount:
      (p.playlist_accounts?.[0] as unknown as { count: number } | undefined)?.count ?? 0,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">All playlists</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Curated collections of creators worth following.
        </p>
      </div>

      {enriched.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No playlists yet — check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriched.map((p) => (
            <PlaylistCard
              key={p.id}
              playlist={p}
              isSubscribed={subscribedIds.has(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

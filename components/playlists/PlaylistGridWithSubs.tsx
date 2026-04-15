"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlaylistCard from "./PlaylistCard";

interface PlaylistData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_emoji: string;
  subscriberCount: number;
  accountCount: number;
}

interface Props {
  playlists: PlaylistData[];
}

/**
 * Client component that renders a playlist grid and loads
 * subscription state after hydration. Used by ISR pages to
 * avoid calling cookies() at the page level.
 */
export default function PlaylistGridWithSubs({ playlists }: Props) {
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile) return;

          supabase
            .from("playlist_subscriptions")
            .select("playlist_id")
            .eq("user_id", profile.id)
            .eq("is_active", true)
            .then(({ data: subs }) => {
              setSubscribedIds(
                new Set((subs ?? []).map((s) => s.playlist_id))
              );
            });
        });
    });
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {playlists.map((p) => (
        <PlaylistCard
          key={p.id}
          playlist={p}
          isSubscribed={subscribedIds.has(p.id)}
        />
      ))}
    </div>
  );
}

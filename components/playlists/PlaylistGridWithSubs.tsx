"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PlaylistCard from "./PlaylistCard";
import SubscribeButton from "./SubscribeButton";
import { buttonVariants } from "@/components/ui/button";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoaded(true);
          return;
        }

        setIsLoggedIn(true);

        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!profile) {
          setLoaded(true);
          return;
        }

        const { data: subs } = await supabase
          .from("playlist_subscriptions")
          .select("playlist_id")
          .eq("user_id", profile.id)
          .eq("is_active", true);

        setSubscribedIds(new Set((subs ?? []).map((s) => s.playlist_id)));
      } catch {
        // Non-fatal — grid renders without subscription badges
      } finally {
        setLoaded(true);
      }
    }

    loadSubscriptions();
  }, []);

  const handleToggle = useCallback((playlistId: string, subscribed: boolean) => {
    setSubscribedIds((prev) => {
      const next = new Set(prev);
      if (subscribed) {
        next.add(playlistId);
      } else {
        next.delete(playlistId);
      }
      return next;
    });
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {playlists.map((p) => (
        <div key={p.id} className="relative">
          <PlaylistCard
            playlist={p}
            isSubscribed={subscribedIds.has(p.id)}
          />
          {loaded && (
            <div className="absolute top-4 right-4">
              {isLoggedIn ? (
                <SubscribeButton
                  playlistId={p.id}
                  initialSubscribed={subscribedIds.has(p.id)}
                  onToggle={(subscribed) => handleToggle(p.id, subscribed)}
                />
              ) : (
                <Link
                  href={`/login?redirectTo=/playlists/${p.slug}`}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Follow
                </Link>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

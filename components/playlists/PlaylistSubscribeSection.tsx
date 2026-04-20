"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import SubscribeButton from "./SubscribeButton";

interface Props {
  playlistId: string;
  playlistSlug: string;
}

/**
 * Client component that checks auth state and shows either the
 * subscribe button (logged in) or a Follow → signup CTA (logged out).
 */
export default function PlaylistSubscribeSection({
  playlistId,
  playlistSlug,
}: Props) {
  const [state, setState] = useState<{
    loaded: boolean;
    loggedIn: boolean;
    subscribed: boolean;
  }>({ loaded: false, loggedIn: false, subscribed: false });

  useEffect(() => {
    async function loadState() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setState({ loaded: true, loggedIn: false, subscribed: false });
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!profile) {
          setState({ loaded: true, loggedIn: true, subscribed: false });
          return;
        }

        const { data: sub } = await supabase
          .from("playlist_subscriptions")
          .select("is_active")
          .eq("user_id", profile.id)
          .eq("playlist_id", playlistId)
          .single();

        setState({
          loaded: true,
          loggedIn: true,
          subscribed: sub?.is_active ?? false,
        });
      } catch {
        setState({ loaded: true, loggedIn: false, subscribed: false });
      }
    }

    loadState();
  }, [playlistId]);

  if (!state.loaded) return null;

  if (!state.loggedIn) {
    return (
      <Link
        href={`/login?redirectTo=/playlists/${playlistSlug}`}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        Follow
      </Link>
    );
  }

  return (
    <SubscribeButton
      playlistId={playlistId}
      initialSubscribed={state.subscribed}
    />
  );
}

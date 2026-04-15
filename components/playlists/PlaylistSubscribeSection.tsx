"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SubscribeButton from "./SubscribeButton";

interface Props {
  playlistId: string;
}

/**
 * Client component that checks auth state and shows the subscribe
 * button if the user is logged in. Used by the ISR playlist detail page.
 */
export default function PlaylistSubscribeSection({ playlistId }: Props) {
  const [state, setState] = useState<{
    loaded: boolean;
    loggedIn: boolean;
    subscribed: boolean;
  }>({ loaded: false, loggedIn: false, subscribed: false });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setState({ loaded: true, loggedIn: false, subscribed: false });
        return;
      }

      supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile) {
            setState({ loaded: true, loggedIn: true, subscribed: false });
            return;
          }

          supabase
            .from("playlist_subscriptions")
            .select("is_active")
            .eq("user_id", profile.id)
            .eq("playlist_id", playlistId)
            .single()
            .then(({ data: sub }) => {
              setState({
                loaded: true,
                loggedIn: true,
                subscribed: sub?.is_active ?? false,
              });
            });
        });
    });
  }, [playlistId]);

  if (!state.loaded || !state.loggedIn) return null;

  return (
    <SubscribeButton
      playlistId={playlistId}
      initialSubscribed={state.subscribed}
    />
  );
}

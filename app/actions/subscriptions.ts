"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PlaylistIdSchema = z.string().uuid("Invalid playlist ID");

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) throw new Error("User profile not found");

  return profile.id;
}

export async function subscribeToPlaylist(rawPlaylistId: unknown) {
  const playlistId = PlaylistIdSchema.parse(rawPlaylistId);
  const userId = await getAuthenticatedUserId();

  const supabase = await createClient();
  const { error } = await supabase.from("playlist_subscriptions").upsert(
    { user_id: userId, playlist_id: playlistId, is_active: true },
    { onConflict: "user_id,playlist_id" }
  );

  if (error) throw new Error(`Subscribe failed: ${error.message}`);

  revalidatePath("/feed");
  revalidatePath("/playlists");
  revalidatePath(`/playlists`);
}

export async function unsubscribeFromPlaylist(rawPlaylistId: unknown) {
  const playlistId = PlaylistIdSchema.parse(rawPlaylistId);
  const userId = await getAuthenticatedUserId();

  const supabase = await createClient();
  const { error } = await supabase
    .from("playlist_subscriptions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("playlist_id", playlistId);

  if (error) throw new Error(`Unsubscribe failed: ${error.message}`);

  revalidatePath("/feed");
  revalidatePath("/playlists");
}

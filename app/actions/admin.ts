"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { slugify } from "@/lib/utils";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function assertAdmin() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  return { supabase, adminUserId: profile.id };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const PlaylistSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  coverEmoji: z.string().max(8).default("📋"),
  isPublic: z.boolean().default(true),
});

const AddAccountSchema = z.object({
  playlistId: z.string().uuid(),
  handle: z
    .string()
    .min(1)
    .max(50)
    .transform((h) => h.replace(/^@/, "").toLowerCase()),
  displayName: z.string().min(1).max(100),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
});

// ─── Playlist CRUD ────────────────────────────────────────────────────────────

export async function createPlaylist(formData: FormData) {
  const { supabase, adminUserId } = await assertAdmin();

  const raw = {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    coverEmoji: formData.get("coverEmoji") || "📋",
    isPublic: formData.get("isPublic") === "true",
  };

  const data = PlaylistSchema.parse(raw);
  const slug = slugify(data.name);

  const { data: playlist, error } = await supabase
    .from("playlists")
    .insert({
      curator_id: adminUserId,
      name: data.name,
      description: data.description ?? null,
      slug,
      cover_emoji: data.coverEmoji,
      is_public: data.isPublic,
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(`Create playlist failed: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/playlists", "layout");
  revalidatePath("/admin");
  redirect(`/admin/playlists/${playlist.id}/edit`);
}

export async function updatePlaylist(playlistId: string, formData: FormData) {
  const { supabase } = await assertAdmin();

  z.string().uuid().parse(playlistId);

  const raw = {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    coverEmoji: formData.get("coverEmoji") || "📋",
    isPublic: formData.get("isPublic") === "true",
  };

  const data = PlaylistSchema.parse(raw);

  const { error } = await supabase
    .from("playlists")
    .update({
      name: data.name,
      description: data.description ?? null,
      cover_emoji: data.coverEmoji,
      is_public: data.isPublic,
    })
    .eq("id", playlistId);

  if (error) throw new Error(`Update playlist failed: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/playlists", "layout");
  revalidatePath("/admin");
}

export async function deletePlaylist(playlistId: string) {
  const { supabase } = await assertAdmin();
  z.string().uuid().parse(playlistId);

  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);

  if (error) throw new Error(`Delete playlist failed: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/playlists", "layout");
  revalidatePath("/admin");
  redirect("/admin");
}

// ─── Account management ───────────────────────────────────────────────────────

export async function addAccountToPlaylist(formData: FormData) {
  const { supabase } = await assertAdmin();

  const data = AddAccountSchema.parse({
    playlistId: formData.get("playlistId"),
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
  });

  // Upsert the account (may already exist from another playlist)
  const { data: account, error: accountError } = await supabase
    .from("twitter_accounts")
    .upsert(
      {
        handle: data.handle,
        display_name: data.displayName,
        bio: data.bio ?? null,
        avatar_url: data.avatarUrl ?? null,
      },
      { onConflict: "handle" }
    )
    .select("id")
    .single();

  if (accountError || !account)
    throw new Error(`Account upsert failed: ${accountError?.message}`);

  // Link to playlist
  const { error: linkError } = await supabase
    .from("playlist_accounts")
    .upsert(
      { playlist_id: data.playlistId, twitter_account_id: account.id },
      { onConflict: "playlist_id,twitter_account_id", ignoreDuplicates: true }
    );

  if (linkError) throw new Error(`Link failed: ${linkError.message}`);

  revalidatePath(`/admin/playlists/${data.playlistId}/edit`);
  revalidatePath(`/playlists`);
}

export async function removeAccountFromPlaylist(
  playlistId: string,
  twitterAccountId: string
) {
  const { supabase } = await assertAdmin();
  z.string().uuid().parse(playlistId);
  z.string().uuid().parse(twitterAccountId);

  const { error } = await supabase
    .from("playlist_accounts")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("twitter_account_id", twitterAccountId);

  if (error) throw new Error(`Remove account failed: ${error.message}`);

  revalidatePath(`/admin/playlists/${playlistId}/edit`);
  revalidatePath(`/playlists`);
}

export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  updatePlaylist,
  addAccountToPlaylist,
  removeAccountFromPlaylist,
} from "@/app/actions/admin";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlaylistPage({ params }: Props) {
  const { id } = await params;

  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/");

  const supabase = await createClient();

  const { data: playlist } = await supabase
    .from("playlists")
    .select(
      `id, name, description, cover_emoji, is_public, slug,
       playlist_accounts(
         twitter_account_id,
         twitter_accounts(id, handle, display_name, bio, avatar_url)
       )`
    )
    .eq("id", id)
    .single();

  if (!playlist) notFound();

  const accounts = (playlist.playlist_accounts ?? [])
    .map((pa) => pa.twitter_accounts)
    .filter(Boolean) as {
    id: string;
    handle: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
  }[];

  const updateWithId = updatePlaylist.bind(null, id);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Admin
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Edit playlist
        </h1>
      </div>

      {/* Edit playlist metadata */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h2>
        <form action={updateWithId} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="coverEmoji">Emoji</Label>
            <Input
              id="coverEmoji"
              name="coverEmoji"
              defaultValue={playlist.cover_emoji}
              maxLength={8}
              className="w-20 text-center text-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={playlist.name}
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={playlist.description ?? ""}
              rows={3}
              maxLength={300}
            />
          </div>

          <input type="hidden" name="isPublic" value={String(playlist.is_public)} />

          <Button type="submit" size="sm">
            Save changes
          </Button>
        </form>
      </section>

      {/* Manage creators */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Creators ({accounts.length})
        </h2>

        {accounts.length > 0 && (
          <ul className="space-y-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5 shadow-sm"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={account.avatar_url ?? undefined}
                    alt={account.display_name}
                  />
                  <AvatarFallback className="text-xs">
                    {account.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {account.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{account.handle}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await removeAccountFromPlaylist(id, account.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {/* Add creator form */}
        <div className="border border-dashed border-border rounded-lg p-4 space-y-4">
          <p className="text-sm font-medium">Add creator</p>
          <form action={addAccountToPlaylist} className="space-y-3">
            <input type="hidden" name="playlistId" value={id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="handle" className="text-xs">
                  Handle
                </Label>
                <Input
                  id="handle"
                  name="handle"
                  placeholder="@karpathy"
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="displayName" className="text-xs">
                  Display name
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="Andrej Karpathy"
                  required
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bio" className="text-xs">
                Bio (optional)
              </Label>
              <Input
                id="bio"
                name="bio"
                placeholder="Short description"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="avatarUrl" className="text-xs">
                Avatar URL (optional)
              </Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                placeholder="https://pbs.twimg.com/..."
                className="h-8 text-sm"
              />
            </div>

            <Button type="submit" size="sm" variant="outline">
              Add creator
            </Button>
          </form>
        </div>
      </section>

      {/* Preview link */}
      <div className="pt-2">
        <Link
          href={`/playlists/${playlist.slug}`}
          className="text-sm text-primary hover:underline"
          target="_blank"
        >
          Preview playlist →
        </Link>
      </div>
    </div>
  );
}

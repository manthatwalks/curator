export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/supabase/auth";
import { extractCount } from "@/lib/supabase/count";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deletePlaylist } from "@/app/actions/admin";

export default async function AdminPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/");

  const supabase = await createClient();
  const { data: playlists } = await supabase
    .from("playlists")
    .select(
      `id, name, slug, cover_emoji, is_public,
       playlist_accounts(count),
       playlist_subscriptions(count)`
    )
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <Link href="/admin/playlists/new" className={buttonVariants({ size: "sm" })}>
          New playlist
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Playlists
        </h2>

        {!playlists?.length ? (
          <p className="text-sm text-muted-foreground">No playlists yet.</p>
        ) : (
          <ul className="space-y-2">
            {playlists.map((p) => {
              const accountCount = extractCount(p.playlist_accounts);
              const subscriberCount = extractCount(p.playlist_subscriptions);

              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-sm"
                >
                  <span className="text-xl shrink-0">{p.cover_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {p.name}
                      </span>
                      {!p.is_public && (
                        <Badge variant="secondary" className="text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {accountCount} creators · {subscriberCount} followers
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/playlists/${p.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Edit
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deletePlaylist(p.id);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        type="submit"
                      >
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPlaylist } from "@/app/actions/admin";

export default async function NewPlaylistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("auth_id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Admin
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          New playlist
        </h1>
      </div>

      <form action={createPlaylist} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="coverEmoji">Emoji</Label>
          <Input
            id="coverEmoji"
            name="coverEmoji"
            defaultValue="📋"
            maxLength={8}
            className="w-20 text-center text-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="AI Researchers"
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
            placeholder="What is this playlist about?"
            rows={3}
            maxLength={300}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="hidden"
            name="isPublic"
            value="true"
          />
          <span className="text-sm text-muted-foreground">
            Visible to all users
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit">Create playlist</Button>
          <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

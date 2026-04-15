import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Generate a collision-resistant username from email + user ID. */
function generateUsername(email: string, userId: string): string {
  const prefix = email.split("@")[0];
  const base = prefix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 22) || "user";
  // Append short UUID fragment to prevent collisions between similar emails
  return `${base}_${userId.slice(0, 8)}`;
}

/** Validate redirect target is a safe relative path (not an open redirect). */
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/feed";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/feed";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Upsert user profile — this is the PRIMARY creation path.
      // The DB trigger (handle_new_user) is a fallback for edge cases.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("users").upsert(
          {
            auth_id: user.id,
            email: user.email!,
            username: generateUsername(user.email!, user.id),
            name:
              (user.user_metadata?.full_name as string) ??
              user.email!.split("@")[0],
            avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
            is_admin: false,
          },
          { onConflict: "auth_id", ignoreDuplicates: true }
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

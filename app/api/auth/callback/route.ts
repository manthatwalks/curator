import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function generateUsername(email: string): string {
  const prefix = email.split("@")[0];
  return prefix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) || "user";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

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
            username: generateUsername(user.email!),
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

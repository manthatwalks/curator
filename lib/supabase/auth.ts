import { createClient } from "./server";

export interface AuthProfile {
  id: string;
  is_admin: boolean;
}

/** Returns null if the user is not authenticated or has no profile. */
export async function getAuthProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("auth_id", user.id)
    .single();

  return profile ?? null;
}

/**
 * Returns the authenticated user's profile or throws.
 * Use in server actions where authentication is mandatory.
 */
export async function requireAuthProfile(): Promise<AuthProfile> {
  const profile = await getAuthProfile();
  if (!profile) throw new Error("Unauthenticated");
  return profile;
}

/**
 * Returns the authenticated admin's profile or throws.
 * Use in admin server actions.
 */
export async function requireAdmin(): Promise<AuthProfile> {
  const profile = await requireAuthProfile();
  if (!profile.is_admin) throw new Error("Forbidden: admin only");
  return profile;
}

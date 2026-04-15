// Public client for ISR pages — uses the anon key (no cookies, no service role).
// Public playlists, tweets, and twitter accounts are readable by the anon role
// per the RLS policies in the schema.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

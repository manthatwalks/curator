import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Smart redirect: logged-in users go to feed, others to discover
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/feed");
  } else {
    redirect("/discover");
  }
}

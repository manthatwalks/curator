import Navbar from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("auth_id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}

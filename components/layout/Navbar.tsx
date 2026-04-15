"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/feed", label: "Feed", requiresAuth: true },
  { href: "/playlists", label: "Playlists" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setIsAdmin(false);
        }
      }
    );
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("users")
          .select("is_admin")
          .eq("auth_id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            setIsAdmin(profile?.is_admin ?? false);
          });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    if (!supabaseRef.current) return;
    await supabaseRef.current.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-semibold text-base tracking-tight shrink-0"
        >
          Curator
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 flex-1">
          {NAV_LINKS.filter((l) => !l.requiresAuth || user).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Auth */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              }
            >
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/feed" />}>
                My Feed
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem render={<Link href="/admin" />}>
                  Admin Panel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

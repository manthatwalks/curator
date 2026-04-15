"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";

/**
 * Shows login/signup CTA only for unauthenticated users.
 * Renders nothing during SSR and while checking auth state,
 * so logged-in users never see a flash.
 */
export default function AuthAwareCTA() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // While loading or if logged in, render nothing
  if (isLoggedIn !== false) return null;

  return (
    <div className="flex gap-3 pt-2">
      <Link href="/signup" className={buttonVariants()}>
        Get started
      </Link>
      <Link href="/login" className={buttonVariants({ variant: "outline" })}>
        Sign in
      </Link>
    </div>
  );
}

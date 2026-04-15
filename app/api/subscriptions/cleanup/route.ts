import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron job: hard-delete inactive subscriptions older than 90 days.
 * Scheduled weekly via vercel.json (Sundays at 03:00 UTC).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc(
    "cleanup_stale_subscriptions",
    { p_retention_days: 90 }
  );

  if (error) {
    return NextResponse.json(
      { error: `Cleanup failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deleted: data ?? 0,
    retentionDays: 90,
    timestamp: new Date().toISOString(),
  });
}

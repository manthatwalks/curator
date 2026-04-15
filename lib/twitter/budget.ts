import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tracks X API read usage against the monthly budget.
 *
 * Uses a simple Supabase table (api_usage) to persist monthly counters.
 * Budget period resets on the 1st of each month (UTC).
 */

export interface ApiBudget {
  readonly monthlyLimit: number;
  readonly used: number;
  readonly remaining: number;
  readonly periodStart: string; // ISO date (YYYY-MM-01)
}

const MONTHLY_LIMIT = parseInt(
  process.env.X_API_MONTHLY_LIMIT ?? "10000",
  10
);

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Get the current budget status. */
export async function getBudget(): Promise<ApiBudget> {
  const supabase = createAdminClient();
  const period = currentPeriod();

  const { data } = await supabase
    .from("api_usage")
    .select("read_count")
    .eq("period", period)
    .single();

  const used = data?.read_count ?? 0;

  return {
    monthlyLimit: MONTHLY_LIMIT,
    used,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    periodStart: period,
  };
}

/**
 * Record API reads consumed during a sync batch.
 * Uses upsert with on-conflict increment so concurrent syncs are safe.
 */
export async function recordReads(count: number): Promise<void> {
  if (count <= 0) return;

  const supabase = createAdminClient();
  const period = currentPeriod();

  // Try to increment existing row first
  const { data: existing } = await supabase
    .from("api_usage")
    .select("read_count")
    .eq("period", period)
    .single();

  if (existing) {
    await supabase
      .from("api_usage")
      .update({ read_count: existing.read_count + count })
      .eq("period", period);
  } else {
    await supabase
      .from("api_usage")
      .insert({ period, read_count: count });
  }
}

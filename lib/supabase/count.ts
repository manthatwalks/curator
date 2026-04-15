/**
 * Extract a count from Supabase's aggregate query response.
 *
 * Supabase returns `relation(count)` as `[{ count: N }]` but types it
 * as the full row type. This helper centralizes the extraction and
 * provides runtime type validation.
 */
export function extractCount(
  aggregate: unknown[] | null | undefined
): number {
  const first = aggregate?.[0] as { count?: number } | undefined;
  return typeof first?.count === "number" ? first.count : 0;
}

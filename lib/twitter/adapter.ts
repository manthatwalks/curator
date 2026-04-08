import type {
  CreatorAccount,
  FetchTweetsOptions,
  FetchTweetsResult,
} from "./types";

/**
 * ITweetProvider — the single interface all data sources must implement.
 *
 * Implementations:
 *   SeedProvider  — reads from the local `tweets` table (MVP)
 *   XApiProvider  — fetches from X API v2 (Phase A, used only by the sync cron job)
 *
 * Swap path: change TWEET_PROVIDER env var, implement the new provider. No UI changes needed.
 */
export interface ITweetProvider {
  /**
   * Fetch tweets for a given handle.
   * Used by the sync cron job (XApiProvider) and the seed script (SeedProvider).
   * The UI always reads from the local `tweets` table — never calls this directly.
   */
  fetchTweets(
    handle: string,
    options?: FetchTweetsOptions
  ): Promise<FetchTweetsResult>;

  /**
   * Fetch account metadata for a given handle.
   * Used when an admin adds a new creator to a playlist.
   */
  fetchAccount(handle: string): Promise<CreatorAccount | null>;
}

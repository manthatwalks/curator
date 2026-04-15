import type { ITweetProvider } from "./adapter";
import { SeedProvider } from "./seed-provider";
import { XApiProvider } from "./x-api-provider";

/**
 * Factory: returns the correct ITweetProvider based on TWEET_PROVIDER env var.
 *
 * Values:
 *   "seed"  — reads from local DB seed data (MVP, default)
 *   "xapi"  — Official X API v2 (Phase A, cron sync job only)
 *
 * Swap path: change TWEET_PROVIDER, implement the new provider. Zero UI changes.
 */
export function getTweetProvider(): ITweetProvider {
  const provider = process.env.TWEET_PROVIDER ?? "seed";

  switch (provider) {
    case "seed":
      return new SeedProvider();
    case "xapi":
      return new XApiProvider();
    default:
      console.warn(
        `Unknown TWEET_PROVIDER "${provider}", falling back to SeedProvider`
      );
      return new SeedProvider();
  }
}

export type { ITweetProvider } from "./adapter";
export type {
  TweetData,
  CreatorAccount,
  FetchTweetsOptions,
  FetchTweetsResult,
} from "./types";
export type { ApiBudget } from "./budget";
export {
  TweetProviderError,
  RateLimitError,
  BudgetExceededError,
  ApiResponseError,
} from "./errors";

// X API v2 Provider — Phase A ($100/mo Basic tier, 10k reads/month)
//
// TODO: Implement when TWEET_PROVIDER=xapi
//
// Setup:
//   1. developer.x.com → create app → copy Bearer Token
//   2. Add X_API_BEARER_TOKEN to environment variables
//   3. Implement fetchTweets() using:
//      GET https://api.twitter.com/2/users/:id/tweets
//        ?start_time=<last_fetched_at ISO8601>
//        &tweet.fields=created_at,text,attachments
//        &expansions=attachments.media_keys
//        &media.fields=url,preview_image_url,type
//        &max_results=100
//   4. Respect rate limits: 1 request/15min per endpoint on Basic tier
//   5. Log read counts — 10k/month budget at Basic tier
//
// IMPORTANT: This provider is ONLY used by the cron sync job (app/api/tweets/sync).
//            The UI ALWAYS reads from the local `tweets` table. Never call this per-request.

import type { ITweetProvider } from "./adapter";
import type {
  CreatorAccount,
  FetchTweetsOptions,
  FetchTweetsResult,
} from "./types";

export class XApiProvider implements ITweetProvider {
  private readonly bearerToken: string;

  constructor() {
    const token = process.env.X_API_BEARER_TOKEN;
    if (!token) {
      throw new Error(
        "X_API_BEARER_TOKEN is not set. Set TWEET_PROVIDER=seed for MVP."
      );
    }
    this.bearerToken = token;
  }

  async fetchTweets(
    _handle: string,
    _options?: FetchTweetsOptions
  ): Promise<FetchTweetsResult> {
    // TODO: Implement
    // 1. Resolve handle → numeric user ID (GET /2/users/by/username/:username)
    // 2. Fetch timeline (GET /2/users/:id/tweets)
    // 3. Map X API response → TweetData[]
    // 4. Update twitter_accounts.last_fetched_at in DB
    throw new Error(
      "XApiProvider.fetchTweets() not yet implemented. Set TWEET_PROVIDER=seed."
    );
  }

  async fetchAccount(_handle: string): Promise<CreatorAccount | null> {
    // TODO: Implement
    // GET https://api.twitter.com/2/users/by/username/:username
    //   ?user.fields=name,description,profile_image_url
    throw new Error(
      "XApiProvider.fetchAccount() not yet implemented. Set TWEET_PROVIDER=seed."
    );
  }
}

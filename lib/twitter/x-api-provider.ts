import type { ITweetProvider } from "./adapter";
import type {
  CreatorAccount,
  FetchTweetsOptions,
  FetchTweetsResult,
  TweetData,
} from "./types";
import type { ApiBudget } from "./budget";
import { getBudget } from "./budget";
import {
  RateLimitError,
  BudgetExceededError,
  ApiResponseError,
} from "./errors";

// ─── X API v2 response shapes ────────────────────────────────────────────────

interface XUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
}

interface XMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface XTweet {
  id: string;
  text: string;
  created_at: string;
  attachments?: { media_keys?: string[] };
}

interface XTweetListResponse {
  data?: XTweet[];
  includes?: { media?: XMedia[] };
  meta?: { next_token?: string; result_count?: number };
  errors?: Array<{ message: string }>;
}

interface XUserLookupResponse {
  data?: XUser;
  errors?: Array<{ message: string }>;
}

// ─── Provider ────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.twitter.com/2";

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

  // ─── Public API ──────────────────────────────────────────────────────────

  async fetchTweets(
    handle: string,
    options?: FetchTweetsOptions
  ): Promise<FetchTweetsResult> {
    const budget = await getBudget();
    if (budget.remaining <= 0) {
      throw new BudgetExceededError(budget.used, budget.monthlyLimit);
    }

    const cleanHandle = handle.replace(/^@/, "");
    const userId = await this.resolveUserId(cleanHandle);
    if (!userId) {
      return { tweets: [], nextCursor: null, readsConsumed: 1 };
    }

    const limit = options?.limit ?? 100;
    const params = new URLSearchParams({
      "tweet.fields": "created_at,text,attachments",
      "expansions": "attachments.media_keys",
      "media.fields": "url,preview_image_url,type",
      "max_results": String(Math.min(limit, 100)),
    });

    if (options?.since) {
      params.set("start_time", options.since.toISOString());
    }
    if (options?.cursor) {
      params.set("pagination_token", options.cursor);
    }

    const response = await this.request<XTweetListResponse>(
      `/users/${userId}/tweets?${params.toString()}`
    );

    const mediaMap = new Map<string, string>();
    for (const media of response.includes?.media ?? []) {
      const url = media.url ?? media.preview_image_url;
      if (url) mediaMap.set(media.media_key, url);
    }

    const account: CreatorAccount = {
      id: userId,
      handle: cleanHandle,
      displayName: cleanHandle,
      bio: null,
      avatarUrl: null,
    };

    const tweets: TweetData[] = (response.data ?? []).map((t) => {
      const mediaUrls = (t.attachments?.media_keys ?? [])
        .map((key) => mediaMap.get(key))
        .filter((url): url is string => !!url);

      return {
        twitterId: t.id,
        text: t.text,
        mediaUrls,
        publishedAt: new Date(t.created_at),
        author: account,
      };
    });

    const resultCount = response.meta?.result_count ?? tweets.length;

    return {
      tweets,
      nextCursor: response.meta?.next_token ?? null,
      readsConsumed: resultCount + 1, // +1 for user lookup if needed
    };
  }

  async fetchAccount(handle: string): Promise<CreatorAccount | null> {
    const cleanHandle = handle.replace(/^@/, "");

    const params = new URLSearchParams({
      "user.fields": "name,description,profile_image_url",
    });

    const response = await this.request<XUserLookupResponse>(
      `/users/by/username/${cleanHandle}?${params.toString()}`
    );

    if (!response.data) return null;

    return {
      id: response.data.id,
      handle: response.data.username,
      displayName: response.data.name,
      bio: response.data.description ?? null,
      avatarUrl: response.data.profile_image_url ?? null,
    };
  }

  async getBudget(): Promise<ApiBudget> {
    return getBudget();
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private async resolveUserId(handle: string): Promise<string | null> {
    const response = await this.request<XUserLookupResponse>(
      `/users/by/username/${handle}`
    );
    return response.data?.id ?? null;
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${BASE_URL}${path}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.bearerToken}` },
      cache: "no-store",
    });

    // Rate limit handling
    if (res.status === 429) {
      const resetHeader = res.headers.get("x-rate-limit-reset");
      const retryAfter = resetHeader
        ? new Date(parseInt(resetHeader, 10) * 1000)
        : new Date(Date.now() + 15 * 60 * 1000); // default 15 min
      throw new RateLimitError(retryAfter);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new ApiResponseError(res.status, body);
    }

    return res.json() as Promise<T>;
  }
}

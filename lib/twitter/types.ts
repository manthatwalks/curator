export interface CreatorAccount {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

export interface TweetData {
  twitterId: string;
  text: string;
  mediaUrls: string[];
  publishedAt: Date;
  author: CreatorAccount;
}

export interface FetchTweetsOptions {
  /** Only fetch tweets newer than this timestamp (for incremental X API syncs) */
  since?: Date;
  limit?: number;
  /** Opaque cursor: base64(`${published_at}|${id}`) */
  cursor?: string;
}

export interface FetchTweetsResult {
  tweets: TweetData[];
  /** null when there are no more results */
  nextCursor: string | null;
  /** Number of API reads consumed (for budget tracking) */
  readsConsumed: number;
}

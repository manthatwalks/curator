/** Base error for all tweet provider failures. */
export class TweetProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "TweetProviderError";
  }
}

/** X API rate limit exceeded — retry after the specified time. */
export class RateLimitError extends TweetProviderError {
  constructor(public readonly retryAfter: Date) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter.toISOString()}`,
      "RATE_LIMITED",
      true
    );
    this.name = "RateLimitError";
  }
}

/** Monthly API read budget exhausted. */
export class BudgetExceededError extends TweetProviderError {
  constructor(
    public readonly used: number,
    public readonly limit: number
  ) {
    super(
      `Monthly API budget exceeded: ${used}/${limit} reads used`,
      "BUDGET_EXCEEDED",
      false
    );
    this.name = "BudgetExceededError";
  }
}

/** X API returned an unexpected response or error. */
export class ApiResponseError extends TweetProviderError {
  constructor(
    public readonly statusCode: number,
    public readonly responseBody: string
  ) {
    super(
      `X API error ${statusCode}: ${responseBody.slice(0, 200)}`,
      "API_ERROR",
      statusCode >= 500
    );
    this.name = "ApiResponseError";
  }
}

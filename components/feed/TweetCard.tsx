import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";

export interface TweetCardData {
  id: string;
  twitter_id: string;
  text: string;
  media_urls: string[];
  published_at: string;
  twitter_accounts: {
    handle: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface TweetCardProps {
  tweet: TweetCardData;
}

const MENTION_HASHTAG_URL_RE = /(@\w{1,15})|(#\w+)|(https?:\/\/[^\s]+)/g;

function renderTweetText(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_HASHTAG_URL_RE);
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [token] = match;
    let href: string;
    if (token.startsWith("@")) {
      href = `https://x.com/${token.slice(1)}`;
    } else if (token.startsWith("#")) {
      href = `https://x.com/hashtag/${encodeURIComponent(token.slice(1))}`;
    } else {
      href = token;
    }
    parts.push(
      <a
        key={`tok-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#1d9bf0] hover:underline"
      >
        {token}
      </a>,
    );
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="X"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconReply() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
    </svg>
  );
}

function IconRepost() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
    </svg>
  );
}

function IconLike() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
    </svg>
  );
}

// No metrics rendered anywhere in this component — this is intentional.
// Curator's core promise: content without engagement pressure.
export default function TweetCard({ tweet }: TweetCardProps) {
  const { twitter_accounts: author } = tweet;
  const mediaUrls = tweet.media_urls;
  const initials = author.display_name.slice(0, 2).toUpperCase();

  const profileUrl = `https://x.com/${author.handle}`;
  const permalink = `https://x.com/${author.handle}/status/${tweet.twitter_id}`;
  const replyUrl = `https://x.com/intent/tweet?in_reply_to=${tweet.twitter_id}`;
  const repostUrl = `https://x.com/intent/retweet?tweet_id=${tweet.twitter_id}`;
  const likeUrl = `https://x.com/intent/like?tweet_id=${tweet.twitter_id}`;

  return (
    <article className="relative bg-card rounded-lg border border-border shadow-sm p-4 space-y-3">
      {/* X logo attribution */}
      <a
        href={permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on X"
        className="absolute top-3 right-3 text-foreground/70 hover:text-foreground"
      >
        <XLogo className="h-4 w-4" />
      </a>

      {/* Author row */}
      <div className="flex items-center gap-3 pr-6">
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`@${author.handle} on X`}
          className="shrink-0"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={author.avatar_url ?? undefined} alt={author.display_name} />
            <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm truncate hover:underline"
            >
              {author.display_name}
            </a>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:underline"
            >
              @{author.handle}
            </a>
          </div>
        </div>
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground shrink-0 hover:underline"
          title={new Date(tweet.published_at).toLocaleString()}
        >
          <time dateTime={tweet.published_at}>
            {formatRelativeTime(tweet.published_at)}
          </time>
        </a>
      </div>

      {/* Tweet text */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {renderTweetText(tweet.text)}
      </p>

      {/* Media */}
      {mediaUrls.length > 0 && (
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className={`grid gap-1.5 rounded-lg overflow-hidden ${
            mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {mediaUrls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative aspect-video bg-muted overflow-hidden rounded-md">
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          ))}
        </a>
      )}

      {/* Web Intent actions */}
      <div className="flex items-center gap-6 pt-1 text-muted-foreground">
        <a
          href={replyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Reply on X"
          className="flex items-center gap-1.5 text-xs hover:text-[#1d9bf0]"
        >
          <IconReply />
          <span>Reply</span>
        </a>
        <a
          href={repostUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Repost on X"
          className="flex items-center gap-1.5 text-xs hover:text-[#00ba7c]"
        >
          <IconRepost />
          <span>Repost</span>
        </a>
        <a
          href={likeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Like on X"
          className="flex items-center gap-1.5 text-xs hover:text-[#f91880]"
        >
          <IconLike />
          <span>Like</span>
        </a>
      </div>
    </article>
  );
}

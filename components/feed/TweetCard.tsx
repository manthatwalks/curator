import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";

export interface TweetCardData {
  id: string;
  text: string;
  media_urls: string[];
  published_at: string;
  from_playlist?: string;
  twitter_accounts: {
    handle: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface TweetCardProps {
  tweet: TweetCardData;
}

// No metrics rendered anywhere in this component — this is intentional.
// Curator's core promise: content without engagement pressure.
export default function TweetCard({ tweet }: TweetCardProps) {
  const { twitter_accounts: author } = tweet;
  const mediaUrls = Array.isArray(tweet.media_urls)
    ? (tweet.media_urls as string[])
    : [];

  const initials = author.display_name.slice(0, 2).toUpperCase();

  return (
    <article className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3">
      {/* Author row */}
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={author.avatar_url ?? undefined} alt={author.display_name} />
          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-semibold text-sm truncate">
              {author.display_name}
            </span>
            <span className="text-xs text-muted-foreground">
              @{author.handle}
            </span>
          </div>
        </div>
        <time
          className="text-xs text-muted-foreground shrink-0"
          dateTime={tweet.published_at}
          title={new Date(tweet.published_at).toLocaleString()}
        >
          {formatRelativeTime(tweet.published_at)}
        </time>
      </div>

      {/* Tweet text */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {tweet.text}
      </p>

      {/* Media */}
      {mediaUrls.length > 0 && (
        <div
          className={`grid gap-1.5 rounded-lg overflow-hidden ${
            mediaUrls.length === 1
              ? "grid-cols-1"
              : mediaUrls.length === 2
              ? "grid-cols-2"
              : "grid-cols-2"
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
        </div>
      )}

      {/* Playlist badge (from_playlist populated in feed view) */}
      {tweet.from_playlist && (
        <p className="text-xs text-muted-foreground pt-0.5">
          From{" "}
          <span className="font-medium text-foreground">{tweet.from_playlist}</span>
        </p>
      )}
    </article>
  );
}

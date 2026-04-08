import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlaylistCardProps {
  playlist: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    cover_emoji: string;
    subscriberCount: number;
    accountCount?: number;
  };
  isSubscribed?: boolean;
  className?: string;
}

export default function PlaylistCard({
  playlist,
  isSubscribed = false,
  className,
}: PlaylistCardProps) {
  return (
    <Link href={`/playlists/${playlist.slug}`} className="group block">
      <Card
        className={cn(
          "p-5 shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col gap-3 border-border bg-card",
          className
        )}
      >
        {/* Emoji */}
        <span className="text-3xl leading-none" role="img" aria-label={playlist.name}>
          {playlist.cover_emoji}
        </span>

        {/* Name */}
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-foreground text-base leading-snug group-hover:text-primary transition-colors">
            {playlist.name}
          </h3>
          {playlist.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {playlist.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          {playlist.subscriberCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {playlist.subscriberCount}{" "}
              {playlist.subscriberCount === 1 ? "follower" : "followers"}
            </span>
          )}
          {playlist.accountCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              · {playlist.accountCount}{" "}
              {playlist.accountCount === 1 ? "creator" : "creators"}
            </span>
          )}
          {isSubscribed && (
            <Badge variant="secondary" className="text-xs ml-auto">
              Following
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}

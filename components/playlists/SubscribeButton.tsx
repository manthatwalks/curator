"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  subscribeToPlaylist,
  unsubscribeFromPlaylist,
} from "@/app/actions/subscriptions";

interface SubscribeButtonProps {
  playlistId: string;
  initialSubscribed: boolean;
  onToggle?: (subscribed: boolean) => void;
}

export default function SubscribeButton({
  playlistId,
  initialSubscribed,
  onToggle,
}: SubscribeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const router = useRouter();

  function handleToggle() {
    const nextValue = !isSubscribed;

    // Optimistic update — immediate feedback
    setIsSubscribed(nextValue);
    onToggle?.(nextValue);

    startTransition(async () => {
      try {
        if (nextValue) {
          await subscribeToPlaylist(playlistId);
          toast.success("Added to your feed");
        } else {
          await unsubscribeFromPlaylist(playlistId);
          toast("Removed from your feed");
        }
        // Refresh server components so ISR pages pick up the change
        router.refresh();
      } catch (err) {
        // Revert optimistic update on failure
        setIsSubscribed(!nextValue);
        onToggle?.(!nextValue);
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Button
      variant={isSubscribed ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isSubscribed ? "Following" : "Follow"}
    </Button>
  );
}

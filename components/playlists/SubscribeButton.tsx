"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  subscribeToPlaylist,
  unsubscribeFromPlaylist,
} from "@/app/actions/subscriptions";

interface SubscribeButtonProps {
  playlistId: string;
  initialSubscribed: boolean;
}

export default function SubscribeButton({
  playlistId,
  initialSubscribed,
}: SubscribeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isSubscribed, setOptimisticSubscribed] = useOptimistic(
    initialSubscribed,
    (_state, newValue: boolean) => newValue
  );

  function handleToggle() {
    const nextValue = !isSubscribed;

    startTransition(async () => {
      setOptimisticSubscribed(nextValue);
      try {
        if (nextValue) {
          await subscribeToPlaylist(playlistId);
          toast.success("Added to your feed");
        } else {
          await unsubscribeFromPlaylist(playlistId);
          toast("Removed from your feed");
        }
      } catch (err) {
        // Revert optimistic update on failure
        setOptimisticSubscribed(!nextValue);
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

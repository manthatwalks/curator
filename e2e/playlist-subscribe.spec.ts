import { test, expect } from "@playwright/test";

/**
 * Subscription tests require authentication.
 * TODO: Set up auth fixtures (see feed.spec.ts for details).
 */

test.describe("Playlist Detail (public)", () => {
  // These tests work for any seeded playlist
  // TODO: Replace "test-slug" with an actual seeded playlist slug
  const PLAYLIST_SLUG = "test-slug";

  test.skip("playlist detail page shows playlist info", async ({ page }) => {
    await page.goto(`/playlists/${PLAYLIST_SLUG}`);
    // Should show emoji, name, creators sidebar, and recent posts
    await expect(page.getByRole("heading", { level: 2, name: /creators/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /recent posts/i })).toBeVisible();
  });

  test.skip("playlist detail shows follower count", async ({ page }) => {
    await page.goto(`/playlists/${PLAYLIST_SLUG}`);
    await expect(page.getByText(/followers?/i)).toBeVisible();
  });
});

test.describe.skip("Playlist Subscribe (authenticated)", () => {
  // TODO: Add auth fixture setup
  // test.use({ storageState: "e2e/.auth/user.json" });

  test("subscribe button shows Subscribe for unsubscribed playlist", async ({
    page,
  }) => {
    await page.goto("/playlists/test-slug");
    await expect(
      page.getByRole("button", { name: /subscribe/i })
    ).toBeVisible();
  });

  test("clicking subscribe changes button state (optimistic UI)", async ({
    page,
  }) => {
    await page.goto("/playlists/test-slug");
    const btn = page.getByRole("button", { name: /subscribe/i });
    await btn.click();
    // After optimistic update, button should show "Subscribed" or "Unsubscribe"
    await expect(
      page.getByRole("button", { name: /unsubscribe|subscribed/i })
    ).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

/**
 * Feed tests require authentication.
 *
 * TODO: Set up auth fixtures by either:
 * 1. Creating a test user in Supabase and storing session cookies
 * 2. Using Supabase's service role to generate a test session
 * 3. Setting up a storageState fixture with pre-authenticated cookies
 *
 * For now, these tests verify the redirect behavior for unauthenticated users
 * and document the expected authenticated behavior.
 */

test.describe("Feed (unauthenticated)", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe.skip("Feed (authenticated)", () => {
  // TODO: Add auth fixture setup
  // test.use({ storageState: "e2e/.auth/user.json" });

  test("feed page shows tweet cards", async ({ page }) => {
    await page.goto("/feed");
    await expect(page.getByRole("heading", { name: /your feed/i })).toBeVisible();
    // Tweet cards should be present if user has subscriptions
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("tweet cards display author info", async ({ page }) => {
    await page.goto("/feed");
    const firstCard = page.locator("article").first();
    // Each card should have display name and @handle
    await expect(firstCard.locator("text=@")).toBeVisible();
  });

  test("infinite scroll loads more tweets", async ({ page }) => {
    await page.goto("/feed");
    const initialCount = await page.locator("article").count();
    // Scroll to bottom to trigger IntersectionObserver sentinel
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Wait for new tweets to load
    await page.waitForTimeout(2000);
    const newCount = await page.locator("article").count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});

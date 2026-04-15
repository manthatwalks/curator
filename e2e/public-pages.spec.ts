import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  test("discover page loads with hero text", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /curated feeds/i })
    ).toBeVisible();
  });

  test("discover page shows sign-in CTA for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("playlists page loads", async ({ page }) => {
    await page.goto("/playlists");
    await expect(
      page.getByRole("heading", { name: /all playlists/i })
    ).toBeVisible();
  });

  test("navbar contains Discover and Playlists links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header nav");
    await expect(nav.getByRole("link", { name: "Discover" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Playlists" })).toBeVisible();
  });

  test("logo links to homepage", async ({ page }) => {
    await page.goto("/playlists");
    await page.getByRole("link", { name: "Curator" }).click();
    await expect(page).toHaveURL("/");
  });
});

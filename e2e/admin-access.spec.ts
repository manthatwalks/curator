import { test, expect } from "@playwright/test";

/**
 * Admin access control tests.
 * The proxy now checks is_admin for /admin routes (defense-in-depth).
 */

test.describe("Admin Access (unauthenticated)", () => {
  test("unauthenticated user on /admin redirects to /login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user on /admin/playlists/new redirects to /login", async ({
    page,
  }) => {
    await page.goto("/admin/playlists/new");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe.skip("Admin Access (non-admin user)", () => {
  // TODO: Add auth fixture for a regular (non-admin) user
  // test.use({ storageState: "e2e/.auth/regular-user.json" });

  test("non-admin user on /admin redirects to /feed", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL("/feed");
  });
});

test.describe.skip("Admin Access (admin user)", () => {
  // TODO: Add auth fixture for an admin user
  // test.use({ storageState: "e2e/.auth/admin-user.json" });

  test("admin can see admin dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: /admin/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /new playlist/i })
    ).toBeVisible();
  });

  test("admin can navigate to new playlist form", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: /new playlist/i }).click();
    await expect(page).toHaveURL("/admin/playlists/new");
    await expect(page.getByLabel("Name")).toBeVisible();
  });
});

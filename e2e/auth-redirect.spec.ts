import { test, expect } from "@playwright/test";

test.describe("Auth Redirects", () => {
  test("unauthenticated user on /feed redirects to /login", async ({
    page,
  }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user on /admin redirects to /login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders with Google OAuth button", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /continue with google/i })
    ).toBeVisible();
  });

  test("login page renders email/password form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: /sign up/i })
    ).toBeVisible();
  });

  test("redirectTo param is preserved in login URL", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/redirectTo=%2Ffeed/);
  });
});

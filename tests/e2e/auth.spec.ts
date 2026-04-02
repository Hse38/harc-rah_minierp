import { test, expect } from "@playwright/test";
import { loginAs, logout } from "./helpers/auth";

test.describe("Authentication", () => {
  test("login with valid credentials redirects to correct dashboard (deneyap)", async ({ page }) => {
    await loginAs(page, "deneyap");
    await expect(page).toHaveURL(/\/dashboard\/deneyap(?:\?|$)/);
  });

  test("login with valid credentials redirects to correct dashboard (bolge)", async ({ page }) => {
    await loginAs(page, "bolge");
    await expect(page).toHaveURL(/\/dashboard\/bolge(?:\?|$)/);
  });

  test("login with valid credentials redirects to correct dashboard (koordinator)", async ({ page }) => {
    await loginAs(page, "koordinator");
    await expect(page).toHaveURL(/\/dashboard\/koordinator(?:\?|$)/);
  });

  test("login with valid credentials redirects to correct dashboard (muhasebe)", async ({ page }) => {
    await loginAs(page, "muhasebe");
    await expect(page).toHaveURL(/\/dashboard\/muhasebe(?:\?|$)/);
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(process.env.TEST_USER_DENEYAP_EMAIL || "fatma.celik@t3vakfi.org");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText("E-posta veya şifre hatalı.")).toBeVisible();
  });

  test("access /dashboard without login redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });

  test("logout redirects to /login", async ({ page }) => {
    await loginAs(page, "deneyap");
    await logout(page);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });
});


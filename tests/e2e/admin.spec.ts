import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Admin access", () => {
  test("non-admin cannot access /dashboard/admin", async ({ page }) => {
    await loginAs(page, "deneyap");
    await page.goto("/dashboard/admin");
    // middleware should redirect away for non-admin
    await expect(page).toHaveURL(/\/dashboard\/deneyap(?:\?|$)/);
  });
});


import { test, expect } from "@playwright/test";
import { loginAs, logout } from "./helpers/auth";
import { createExpenseDeneyap } from "./helpers/expense";

const receiptPath = "tests/fixtures/test-receipt.jpg";

test.describe("Approval Flow", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bolge → koordinator → muhasebe flow to paid", async ({ page }) => {
    test.setTimeout(240_000);
    page.on("console", (msg) => {
      // eslint-disable-next-line no-console
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });
    const unique = `pw-e2e-approval-${Date.now()}`;

    // Create expense as Deneyap
    await loginAs(page, "deneyap");
    const { expenseNumber } = await createExpenseDeneyap(page, {
      expenseType: "Yemek",
      amount: "110",
      description: unique,
      receiptPath,
      extra: { kisi: "2" },
    });
    expect(expenseNumber).toBeTruthy();

    // Approve as Bolge
    await logout(page);
    await loginAs(page, "bolge");
    await page.goto("/dashboard/bolge?tab=pending");

    const bolgeCard = page.locator("[data-expense-id]").filter({ hasText: expenseNumber! }).first();
    await expect(bolgeCard).toBeVisible({ timeout: 30_000 });

    // Must view receipt first (buttons disabled until viewed)
    await bolgeCard.getByRole("button", { name: /Fişi görüntüle/i }).click();
    await page.keyboard.press("Escape");

    await bolgeCard.getByRole("button", { name: /^Onayla$/ }).click();
    await expect(page.getByText("Onaylandı.")).toBeVisible();

    // Approve as Koordinator
    await logout(page);
    await loginAs(page, "koordinator");
    await page.goto("/dashboard/koordinator?tab=awaiting");

    const koordCard = page.locator("[data-expense-id]").filter({ hasText: expenseNumber! }).first();
    await expect(koordCard).toBeVisible({ timeout: 30_000 });
    await koordCard.getByRole("button", { name: /Fişi Gör/i }).click();
    await page.keyboard.press("Escape");
    await koordCard.getByRole("button", { name: /^Onayla$/ }).click();
    await expect(page.getByText("Onaylandı.")).toBeVisible();

    // Verify it left the awaiting list (approved_koord should not be in awaiting).
    await page.reload();
    await expect(page.locator("[data-expense-id]").filter({ hasText: expenseNumber! })).toHaveCount(0, { timeout: 30_000 });

    // And it should appear in completed list.
    await page.goto("/dashboard/koordinator?tab=completed");
    await expect(page.getByText(expenseNumber!)).toBeVisible({ timeout: 30_000 });

    // Mark paid as Muhasebe (requires DB RLS policy allowing muhasebe to SELECT approved_koord)
    await logout(page);
    await loginAs(page, "muhasebe");
    await page.goto("/dashboard/muhasebe");

    const muhCard = page.locator("[data-expense-id]").filter({ hasText: expenseNumber! }).first();
    await expect(muhCard).toBeVisible({ timeout: 120_000 });
    await muhCard.getByRole("button", { name: /Ödendi İşaretle/i }).click();
    await expect(page.getByText("Ödendi olarak işaretlendi.")).toBeVisible();
  });
});


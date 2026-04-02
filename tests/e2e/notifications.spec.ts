import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { createExpenseDeneyap } from "./helpers/expense";

const receiptPath = "tests/fixtures/test-receipt.jpg";

test.describe("Notifications", () => {
  test.skip(
    !!process.env.CI,
    "Notifications are flaky in CI (realtime/cookies), skipped in CI",
    async ({ browser }) => {
    test.setTimeout(180_000);
    const ctxCreate = await browser.newContext();
    const pageCreate = await ctxCreate.newPage();

    // Create expense as Deneyap
    await loginAs(pageCreate, "deneyap");
    const unique = `pw-e2e-notif-${Date.now()}`;
    const { expenseNumber, expenseId } = await createExpenseDeneyap(pageCreate, {
      expenseType: "Diğer",
      amount: "70",
      description: unique,
      receiptPath,
      extra: { digerAciklama: "Test" },
    });
    expect(expenseNumber).toBeTruthy();
    expect(expenseId).toBeTruthy();

    const ctxKoord = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageKoord = await ctxKoord.newPage();
    await loginAs(pageKoord, "koordinator");
    await pageKoord.goto("/dashboard/koordinator");

    // Deterministically create a notification for the logged-in koordinator user.
    const koordUserId = await pageKoord.evaluate(() => {
      // Supabase SSR commonly stores session in cookies (sb-*-auth-token).
      const cookies = document.cookie
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const eq = c.indexOf("=");
          return { name: c.slice(0, eq), value: c.slice(eq + 1) };
        });
      const tokenCookie = cookies.find((c) => c.name.includes("auth-token") && c.name.startsWith("sb-"));
      if (!tokenCookie?.value) return null;
      try {
        const decoded = decodeURIComponent(tokenCookie.value);
        const parsed = JSON.parse(decoded) as any;
        return parsed?.user?.id ?? null;
      } catch {
        return null;
      }
    });
    expect(koordUserId).toBeTruthy();

    await pageKoord.request.post("/api/notify", {
      data: {
        recipientId: koordUserId,
        recipientRole: "koordinator",
        expenseId,
        message: `[${expenseNumber}] test bildirimi.`,
        pushTitle: "TAMGA - Test",
        pushBody: "Test",
        pushUrl: `/dashboard/koordinator?highlight=${expenseId}`,
      },
    });

    await pageKoord.getByRole("button", { name: "Bildirimler" }).click();
    const notifRow = pageKoord.getByRole("button").filter({ hasText: expenseNumber! }).first();
    await expect(notifRow).toBeVisible({ timeout: 120_000 });
    await notifRow.click();

    await expect(pageKoord).toHaveURL(/\/dashboard\/koordinator\?highlight=[^&]+/);
    await ctxKoord.close();
  });
});


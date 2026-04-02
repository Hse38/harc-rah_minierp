import { test, expect } from "@playwright/test";
import crypto from "crypto";
import { loginAs } from "./helpers/auth";
import { createExpenseDeneyap } from "./helpers/expense";

const receiptPath = "tests/fixtures/test-receipt.jpg";

test.describe("Expense Creation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "deneyap");
  });

  test("deneyap user can navigate to Yeni Harcama", async ({ page }) => {
    await page.goto("/dashboard/deneyap");
    await page.goto("/dashboard/deneyap/yeni");
    await expect(page.getByRole("heading", { name: "Yeni Harcama" })).toBeVisible();
  });

  test("form validation: submit without required fields shows errors", async ({ page }) => {
    await page.goto("/dashboard/deneyap/yeni");
    await page.locator("form").evaluate((f) => (f as HTMLFormElement).requestSubmit());
    await expect(page.getByText("Tutar geçerli bir sayı olmalı.")).toBeVisible();
  });

  test("form validation: submit without receipt shows 'Fiş yüklemek zorunludur'", async ({ page }) => {
    await page.goto("/dashboard/deneyap/yeni");

    // select Diğer + fill required fields except receipt
    const trigger = page.locator('button[role="combobox"]').first();
    await trigger.click();
    await page.getByRole("option", { name: "Diğer" }).click();

    await page.getByLabel(/Tutar/i).fill("10");
    await page.getByLabel(/Ne için harcandı/i).fill("Test");
    await page.locator("form").evaluate((f) => (f as HTMLFormElement).requestSubmit());

    await expect(page.getByText("Fiş yüklemek zorunludur")).toBeVisible();
  });

  test("fill form with valid data + mock receipt → expense created successfully", async ({ page }) => {
    const unique = `pw-e2e-${Date.now()}`;
    const { expenseNumber } = await createExpenseDeneyap(page, {
      expenseType: "Yemek",
      amount: "120",
      description: unique,
      receiptPath,
      extra: { kisi: "2" },
    });
    expect(expenseNumber).toMatch(/^HRC-\d+$/);
  });

  test("created expense appears in expense list", async ({ page }) => {
    const unique = `pw-e2e-list-${Date.now()}`;
    const { expenseNumber } = await createExpenseDeneyap(page, {
      // Avoid DB check constraint mismatch in some environments ("Yakıt" may not be allowed).
      expenseType: "Yemek",
      amount: "80",
      description: unique,
      receiptPath,
      extra: { kisi: "2" },
    });
    expect(expenseNumber).toBeTruthy();

    await page.goto("/dashboard/deneyap?tab=list");
    await expect(page.getByText(expenseNumber!)).toBeVisible({ timeout: 30_000 });
  });

  test("duplicate receipt shows 'Bu fiş daha önce kullanıldı'", async ({ page }) => {
    const fisHash = crypto.createHash("sha256").update(`pw-e2e-dup-${Date.now()}`).digest("hex");

    // Mock analyze-receipt so we deterministically get the same fis_hash twice.
    await page.route("**/api/analyze-receipt", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tutar: 50,
          tarih: "01.04.2026",
          isletme: "TEST",
          kategori: "Diğer",
          aciklama: "E2E",
          fis_hash: fisHash,
        }),
      });
    });

    const unique1 = `pw-e2e-dup-1-${Date.now()}`;
    await createExpenseDeneyap(page, {
      expenseType: "Diğer",
      amount: "50",
      description: unique1,
      receiptPath,
      extra: { digerAciklama: "Test" },
    });

    const unique2 = `pw-e2e-dup-2-${Date.now()}`;
    await createExpenseDeneyap(
      page,
      {
        expenseType: "Diğer",
        amount: "60",
        description: unique2,
        receiptPath,
        extra: { digerAciklama: "Test" },
      },
      { expectedStatus: 409 }
    );
    await expect(page.getByText(/Bu fiş daha önce kullanıldı/i)).toBeVisible();
  });
});


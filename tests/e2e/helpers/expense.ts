import { expect, type Page } from "@playwright/test";

export type ExpenseType = "Yakıt" | "Ulaşım" | "Konaklama" | "Yemek" | "Diğer";

export type CreateExpenseInput = {
  expenseType: ExpenseType;
  amount: string; // e.g. "123.45"
  description: string;
  receiptPath: string;
  extra?: { km?: string; kisi?: string; gece?: string; ulasimTip?: "km" | "bilet"; ulasimDeger?: string; digerAciklama?: string };
};

type CreateExpenseResult = { expenseNumber: string | null; expenseId: string | null };

export async function uploadReceipt(page: Page, receiptPath: string) {
  await expect(page.getByText("1. ADIM — Fiş yükle")).toBeVisible({ timeout: 30_000 });

  // ReceiptUploader uses hidden <input type="file"> elements; easiest is to target any file input on the form.
  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toBeAttached();
  await fileInput.setInputFiles(receiptPath);

  // If analysis spinner appears, wait it out so form isn't mid-transition.
  const analyzing = page.getByText("Fiş analiz ediliyor...");
  if (await analyzing.isVisible().catch(() => false)) {
    await expect(analyzing).toBeHidden({ timeout: 60_000 });
  }

  // Some receipts can trigger the "old receipt" confirmation gate.
  const oldGate = page.getByText("Bu fiş 2 aydan eski görünüyor", { exact: false });
  if (await oldGate.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Evet, devam et" }).click();
  }

  // Receipt upload sets receiptUrl; submit button becomes enabled when receiptUrl exists.
  await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 60_000 });
}

function expenseTypeLabel(t: ExpenseType) {
  return t;
}

export async function createExpenseDeneyap(
  page: Page,
  input: CreateExpenseInput,
  opts?: { expectedStatus?: 200 | 409; forceUiFlow?: boolean }
): Promise<CreateExpenseResult> {
  // In CI, Supabase Storage upload can fail due to bucket policy / network,
  // which makes UI-based receipt upload flaky. Prefer creating via API with a placeholder receipt_url.
  if (process.env.CI && !opts?.forceUiFlow) {
    const expectedStatus = opts?.expectedStatus ?? 200;
    const receiptUrl = "https://placehold.co/400x600.jpg";
    // eslint-disable-next-line no-console
    console.log("CI env:", process.env.CI, "Receipt URL:", receiptUrl);
    const payload = {
      expense_type: input.expenseType,
      amount: Number(input.amount),
      description: input.description,
      receipt_url: receiptUrl,
      kategori_detay:
        input.expenseType === "Yakıt"
          ? { km: Number(input.extra?.km ?? "10") }
          : input.expenseType === "Yemek"
            ? { kisi_sayisi: Number(input.extra?.kisi ?? "2") }
            : input.expenseType === "Konaklama"
              ? { gece_sayisi: Number(input.extra?.gece ?? "1") }
              : input.expenseType === "Ulaşım"
                ? {
                    ulasim_tipi: input.extra?.ulasimTip ?? "km",
                    deger: Number(input.extra?.ulasimDeger ?? "5"),
                  }
                : input.expenseType === "Diğer"
                  ? { aciklama: input.extra?.digerAciklama ?? "Test" }
                  : null,
    };

    const res = await page.request.post("/api/expenses/create", { data: payload });
    const json = (await res.json().catch(() => ({}))) as any;
    if (res.status() !== expectedStatus) {
      // eslint-disable-next-line no-console
      console.log("API response status:", res.status());
      // eslint-disable-next-line no-console
      console.log("API response body:", JSON.stringify(json));
      const msg = String(json?.error ?? json?.message ?? "");
      throw new Error(msg || `Unexpected status ${res.status()} (expected ${expectedStatus})`);
    }
    const expenseNumber = typeof json?.expense_number === "string" ? json.expense_number : null;
    const expenseId = typeof json?.id === "string" ? json.id : null;
    return { expenseNumber, expenseId };
  }

  await page.goto("/dashboard/deneyap/yeni");

  // Upload receipt first (required)
  await uploadReceipt(page, input.receiptPath);

  // Select category/type
  // Uses shadcn Select: trigger button then click item.
  const trigger = page.locator("button#expense_type").first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole("option", { name: expenseTypeLabel(input.expenseType) }).click();

  // Amount
  await page.getByLabel(/Tutar/i).fill(input.amount);
  // Description (optional but we set to help find the record)
  await page.getByLabel(/Açıklama/i).fill(input.description);

  // Extra fields required by category
  if (input.expenseType === "Yakıt") {
    await page.getByLabel(/Kaç KM/i).fill(input.extra?.km ?? "10");
  } else if (input.expenseType === "Yemek") {
    await page.getByLabel(/Kaç kişi/i).fill(input.extra?.kisi ?? "2");
  } else if (input.expenseType === "Konaklama") {
    await page.getByLabel(/Kaç gece/i).fill(input.extra?.gece ?? "1");
  } else if (input.expenseType === "Ulaşım") {
    const tip = input.extra?.ulasimTip ?? "km";
    await page.getByRole("radio", { name: new RegExp(tip === "km" ? "KM" : "Bilet", "i") }).check();
    await page.getByLabel(/Kaç KM|kaç bilet/i).fill(input.extra?.ulasimDeger ?? "5");
  } else if (input.expenseType === "Diğer") {
    await page.getByLabel(/Ne için harcandı/i).fill(input.extra?.digerAciklama ?? "Test");
  }

  const expectedStatus = opts?.expectedStatus ?? 200;
  const createResPromise = page.waitForResponse(
    (r) => r.url().includes("/api/expenses/create") && r.request().method() === "POST",
    { timeout: 60_000 }
  );

  // Submit even if the UI disables the submit button (we want validation paths).
  await page.locator("form").evaluate((f) => (f as HTMLFormElement).requestSubmit());

  const res = await createResPromise;
  const payload = (await res.json().catch(() => ({}))) as any;

  if (res.status() !== expectedStatus) {
    const msg = String(payload?.error ?? payload?.message ?? "");
    throw new Error(msg || `Unexpected status ${res.status()} (expected ${expectedStatus})`);
  }

  const expenseNumber = typeof payload?.expense_number === "string" ? payload.expense_number : null;
  const expenseId = typeof payload?.id === "string" ? payload.id : null;
  if (expectedStatus === 200) {
    // The UI redirects on success; don't race the next test step.
    await page.waitForURL(/\/dashboard\/deneyap(?:\?|$)/, { timeout: 30_000 }).catch(() => {});
  }
  return { expenseNumber, expenseId };
}


import { expect, type Page } from "@playwright/test";

type Role = "deneyap" | "bolge" | "koordinator" | "muhasebe";

const ROLE_REDIRECT: Record<Role, string> = {
  deneyap: "/dashboard/deneyap",
  bolge: "/dashboard/bolge",
  koordinator: "/dashboard/koordinator",
  muhasebe: "/dashboard/muhasebe",
};

function getCreds(role: Role): { email: string; password: string } {
  const envKey = (k: string) => process.env[k] || "";
  const map: Record<Role, { emailKey: string; passwordKey: string }> = {
    deneyap: { emailKey: "TEST_USER_DENEYAP_EMAIL", passwordKey: "TEST_USER_DENEYAP_PASSWORD" },
    bolge: { emailKey: "TEST_USER_BOLGE_EMAIL", passwordKey: "TEST_USER_BOLGE_PASSWORD" },
    koordinator: { emailKey: "TEST_USER_KOORD_EMAIL", passwordKey: "TEST_USER_KOORD_PASSWORD" },
    muhasebe: { emailKey: "TEST_USER_MUHASEBE_EMAIL", passwordKey: "TEST_USER_MUHASEBE_PASSWORD" },
  };
  const email = envKey(map[role].emailKey);
  const password = envKey(map[role].passwordKey);
  if (!email || !password) {
    throw new Error(`Missing creds for ${role}. Check .env.test (email/password env vars).`);
  }
  return { email, password };
}

export async function loginAs(page: Page, role: Role) {
  const { email, password } = getCreds(role);
  await page.goto("/login");

  // If middleware redirects away from /login because we're already authenticated,
  // do a best-effort logout and retry.
  const emailInput = page.locator('input[type="email"]');
  if (!(await emailInput.isVisible().catch(() => false))) {
    await page
      .locator('button[aria-label="Çıkış"], button[aria-label="Çıxış"], button[aria-label="Чыгуу"]')
      .first()
      .click()
      .catch(() => {});
    await page.goto("/login");
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  await Promise.all([
    page.waitForURL(new RegExp(`${ROLE_REDIRECT[role]}(?:\\?|$)`), { timeout: 30_000 }),
    page.locator('button[type="submit"]').click(),
  ]).catch(async () => {
    const err = page.locator('[role="alert"], text=E-posta veya şifre hatalı., text=E-posta ve şifre girin.');
    const msg = (await err.first().isVisible().catch(() => false))
      ? await err.first().innerText().catch(() => "Bilinmeyen login hatası")
      : "Login redirect timeout (no error message visible)";
    throw new Error(`Login failed for role=${role}: ${msg}`);
  });

  await expect(page).toHaveURL(new RegExp(`${ROLE_REDIRECT[role]}(?:\\?|$)`), { timeout: 30_000 });
}

export async function logout(page: Page) {
  await page.goto("/dashboard");

  const topbarBtn = page.locator('button[aria-label="Çıkış"], button[aria-label="Çıxış"], button[aria-label="Чыгуу"]').first();
  const sidebarBtn = page.locator('button:has-text("Çıkış"), button:has-text("Çıxış"), button:has-text("Чыгуу")').first();

  if (await topbarBtn.isVisible().catch(() => false)) {
    await topbarBtn.click();
  } else if (await sidebarBtn.isVisible().catch(() => false)) {
    await sidebarBtn.click();
  }

  // If still not logged out, try the other button as fallback.
  if (!/\/login(?:\?|$)/.test(page.url())) {
    if (await sidebarBtn.isVisible().catch(() => false)) await sidebarBtn.click().catch(() => {});
    if (await topbarBtn.isVisible().catch(() => false)) await topbarBtn.click().catch(() => {});
  }

  await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
}


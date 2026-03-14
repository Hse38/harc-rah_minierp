/**
 * Tüm Supabase Auth kullanıcılarını siler (service role gerekir).
 * Önce supabase/migrations/20260314000000_clean_all_for_reseed.sql çalıştırın,
 * sonra bu script'i çalıştırın, ardından seed-users.js ile yeni kullanıcıları ekleyin.
 *
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/clean-auth-users.js
 * veya proje kökünden: node scripts/clean-auth-users.js (.env.local okunur)
 */

const path = require("path");
const fs = require("fs");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    });
}
if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL)
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let page = 1;
  let perPage = 50;
  let total = 0;

  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("listUsers hatası:", error.message);
      process.exit(1);
    }
    if (!users?.length) break;

    for (const u of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) console.error("Silinemedi:", u.email, delErr.message);
      else {
        console.log("Silindi:", u.email);
        total++;
      }
    }
    if (users.length < perPage) break;
    page++;
  }

  console.log("\nToplam silinen:", total);
}

main();

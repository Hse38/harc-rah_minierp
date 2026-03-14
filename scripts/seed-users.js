/**
 * Yeni kullanıcıları Supabase Auth + profiles tablosuna ekler.
 *
 * Önce Supabase SQL Editor'da 20260314000000_clean_all_for_reseed.sql çalıştırın.
 * Auth kullanıcılarını silmek için clean-auth-users.js çalıştırın.
 *
 * Çalıştırma:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-users.js
 * veya proje kökünden: node scripts/seed-users.js (.env.local okunur)
 *
 * Varsayılan şifre: T3Vakfi2026! (ilk girişte değiştirilsin)
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
const TEMP_PASSWORD = process.env.SEED_PASSWORD || "T3Vakfi2026!";

const USERS = [
  // YK Başkanı
  { email: "elvan.kuzucu@t3vakfi.org", full_name: "Elvan Kuzucu Hıdır", role: "yk", il: null, bolge: null },
  // Toplumsal çalışmalar Koordinatörü (TÇK)
  { email: "yuusf.iskender@t3vakfi.org", full_name: "Yuusf Ziya İskender", role: "koordinator", il: null, bolge: null },
  // Bölge sorumluları
  { email: "emrah.hekim@t3vakfi.org", full_name: "Emrah Hekim", role: "bolge", il: null, bolge: "ic_anadolu" },
  { email: "nurkan.karabulut@t3vakfi.org", full_name: "Nurkan Karabulut", role: "bolge", il: null, bolge: "marmara" },
  { email: "tevfik.ekin@t3vakfi.org", full_name: "Tevfik Ekin", role: "bolge", il: null, bolge: "ege" },
  // İl sorumluları (her bölgeye bir il)
  { email: "ahmet.yilmaz@t3vakfi.org", full_name: "Ahmet Yılmaz", role: "il", il: "Ankara", bolge: "ic_anadolu" },
  { email: "ayse.demir@t3vakfi.org", full_name: "Ayşe Demir", role: "il", il: "İstanbul", bolge: "marmara" },
  { email: "mehmet.kaya@t3vakfi.org", full_name: "Mehmet Kaya", role: "il", il: "İzmir", bolge: "ege" },
  // Deneyap sorumluları (her ile bir)
  { email: "fatma.celik@t3vakfi.org", full_name: "Fatma Çelik", role: "deneyap", il: "Ankara", bolge: "ic_anadolu" },
  { email: "ali.oz@t3vakfi.org", full_name: "Ali Öz", role: "deneyap", il: "İstanbul", bolge: "marmara" },
  { email: "zeynep.arslan@t3vakfi.org", full_name: "Zeynep Arslan", role: "deneyap", il: "İzmir", bolge: "ege" },
  // Muhasebe
  { email: "muhlis.semiz@t3vakfi.org", full_name: "Muhlis Semiz", role: "muhasebe", il: null, bolge: null },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri gerekli.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function getUserIdByEmail(email) {
    let page = 1;
    const perPage = 50;
    while (true) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) return null;
      const found = users?.find((x) => x.email === email);
      if (found) return found.id;
      if (!users?.length || users.length < perPage) return null;
      page++;
    }
  }

  console.log("Kullanıcılar oluşturuluyor...\n");

  for (const u of USERS) {
    try {
      let id = null;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: TEMP_PASSWORD,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes("already been registered")) {
          id = await getUserIdByEmail(u.email);
          if (!id) {
            console.log(`Atlandı (zaten var, id bulunamadı): ${u.email}`);
            continue;
          }
        } else throw authError;
      } else {
        id = authData.user?.id;
      }

      if (!id) throw new Error("User id alınamadı");

      const { error: profileError } = await supabase.from("profiles").insert({
        id,
        full_name: u.full_name,
        role: u.role,
        il: u.il,
        bolge: u.bolge,
        iban: null,
      });

      if (profileError) {
        if (profileError.code === "23505") console.log(`Profil zaten var: ${u.email}`);
        else throw profileError;
      } else console.log(`OK: ${u.email} (${u.role})`);
    } catch (err) {
      console.error(`HATA ${u.email}:`, err.message);
    }
  }

  console.log("\nBitti. Varsayılan şifre:", TEMP_PASSWORD);
  console.log("İlk girişten sonra şifreleri değiştirin.");
}

main();

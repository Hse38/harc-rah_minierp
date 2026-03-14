# Tüm kullanıcıları silip şifre 123 ile yeniden oluşturma

Aşağıdaki adımları **sırayla** uygula. Hepsi bittikten sonra tüm hesaplar **şifre: 123** ile giriş yapabilir.

---

## Adım 1: Supabase’de tabloları temizle

1. Tarayıcıda **Supabase Dashboard**’u aç: https://supabase.com/dashboard  
2. Projeyi seç.
3. Sol menüden **SQL Editor**’e gir.
4. **New query** ile yeni bir sorgu aç.
5. Aşağıdaki SQL’i **olduğu gibi** yapıştır:

```sql
DELETE FROM notifications;
DELETE FROM expenses;
DELETE FROM region_limits;
DELETE FROM profiles;
```

(Not: `export_logs` veya `push_subscriptions` tabloları varsa ayrıca `DELETE FROM …;` ekleyebilirsin.)

6. **Run** (veya Ctrl+Enter) ile çalıştır.
7. Hata almadan “Success” gibi bir sonuç görmelisin.

---

## Adım 2: Auth kullanıcılarını sil

1. Bilgisayarında proje klasörünü aç (örn. `harcama_halukerp`).
2. Bu klasörde **terminal** aç (PowerShell veya CMD).
3. Şu komutu çalıştır (`.env.local` otomatik okunur, ekstra bir şey yazmana gerek yok):

```bash
node scripts/clean-auth-users.js
```

4. Çıktıda her kullanıcı için “Silindi: …” yazacak. En sonda “Toplam silinen: …” göreceksin.
5. Hata alırsan: Supabase → **Settings** → **API** → **Project URL** ve **service_role** (secret) anahtarını kontrol et; `.env.local` içinde `NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` doğru mu bak.

---

## Adım 3: Yeni kullanıcıları oluştur (şifre: 123)

1. Aynı terminalde, yine proje kökündeyken:

```bash
node scripts/seed-users.js
```

2. “OK: …” satırlarını göreceksin; 12 kullanıcı oluşturulacak.
3. Varsayılan şifre: **123** (tüm hesaplar için aynı).

---

## Özet

| Adım | Nerede | Ne yapıyorsun |
|------|--------|----------------|
| 1 | Supabase → SQL Editor | Yukarıdaki 6 satırlık SQL’i yapıştırıp **Run** |
| 2 | Terminal (proje klasörü) | `node scripts/clean-auth-users.js` |
| 3 | Terminal (proje klasörü) | `node scripts/seed-users.js` |

Bittikten sonra giriş: herhangi bir kullanıcı e-postası + şifre **123**.

---

## Seed’de oluşturulan kullanıcılar

| Rol | Ad | E-posta | Şifre |
|-----|----|--------|-------|
| YK Başkanı | Elvan Kuzucu Hıdır | elvan.kuzucu@t3vakfi.org | 123 |
| Koordinatör (TÇK) | Yuusf Ziya İskender | yuusf.iskender@t3vakfi.org | 123 |
| Bölge (İç Anadolu) | Emrah Hekim | emrah.hekim@t3vakfi.org | 123 |
| Bölge (Marmara) | Nurkan Karabulut | nurkan.karabulut@t3vakfi.org | 123 |
| Bölge (Ege) | Tevfik Ekin | tevfik.ekin@t3vakfi.org | 123 |
| İl (Ankara) | Ahmet Yılmaz | ahmet.yilmaz@t3vakfi.org | 123 |
| İl (İstanbul) | Ayşe Demir | ayse.demir@t3vakfi.org | 123 |
| İl (İzmir) | Mehmet Kaya | mehmet.kaya@t3vakfi.org | 123 |
| Deneyap (Ankara) | Fatma Çelik | fatma.celik@t3vakfi.org | 123 |
| Deneyap (İstanbul) | Ali Öz | ali.oz@t3vakfi.org | 123 |
| Deneyap (İzmir) | Zeynep Arslan | zeynep.arslan@t3vakfi.org | 123 |
| Muhasebe | Muhlis Semiz | muhlis.semiz@t3vakfi.org | 123 |

İsimleri değiştirmek için `scripts/seed-users.js` içindeki `USERS` dizisini düzenleyip **sadece Adım 2 ve 3**’ü tekrar çalıştırabilirsin. Farklı şifre için: `set SEED_PASSWORD=İstediğinŞifre` (Windows) sonra `node scripts/seed-users.js`.

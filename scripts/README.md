# DB temizleme ve kullanıcı seed

## Sıra

1. **Tabloları temizle**  
   Supabase Dashboard → SQL Editor → yeni sorgu açıp şu migration'ı çalıştır:
   ```
   supabase/migrations/20260314000000_clean_all_for_reseed.sql
   ```
   (İçeriği kopyalayıp yapıştırın.)

2. **Auth kullanıcılarını sil**  
   Terminalde (proje kökünde):
   ```bash
   set SUPABASE_URL=https://xxx.supabase.co
   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
   node scripts/clean-auth-users.js
   ```
   Service role key: Supabase Dashboard → Settings → API → service_role (secret).

3. **Yeni kullanıcıları oluştur**  
   Aynı ortam değişkenleriyle:
   ```bash
   node scripts/seed-users.js
   ```
   Varsayılan şifre: `T3Vakfi2026!` (ilk girişte değiştirilsin).  
   Farklı şifre: `set SEED_PASSWORD=İstediğinizŞifre` sonra `node scripts/seed-users.js`.

## Seed'de oluşturulan kullanıcılar

| Rol | Ad | E-posta |
|-----|----|--------|
| YK Başkanı | Elvan Kuzucu Hıdır | elvan.kuzucu@t3vakfi.org |
| Koordinatör (TÇK) | Yuusf Ziya İskender | yuusf.iskender@t3vakfi.org |
| Bölge (İç Anadolu) | Emrah Hekim | emrah.hekim@t3vakfi.org |
| Bölge (Marmara) | Nurkan Karabulut | nurkan.karabulut@t3vakfi.org |
| Bölge (Ege) | Tevfik Ekin | tevfik.ekin@t3vakfi.org |
| İl (Ankara) | Ahmet Yılmaz | ahmet.yilmaz@t3vakfi.org |
| İl (İstanbul) | Ayşe Demir | ayse.demir@t3vakfi.org |
| İl (İzmir) | Mehmet Kaya | mehmet.kaya@t3vakfi.org |
| Deneyap (Ankara) | Fatma Çelik | fatma.celik@t3vakfi.org |
| Deneyap (İstanbul) | Ali Öz | ali.oz@t3vakfi.org |
| Deneyap (İzmir) | Zeynep Arslan | zeynep.arslan@t3vakfi.org |
| Muhasebe | Muhlis Semiz | muhlis.semiz@t3vakfi.org |

İl ve deneyap isimleri örnek; gerçek isimlerle değiştirmek için `scripts/seed-users.js` içindeki `USERS` dizisini düzenleyin.

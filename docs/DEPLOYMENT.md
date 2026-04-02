# TAMGA — Deployment Runbook

> Bu doküman, TAMGA projesini sıfırdan kurulum ve deploy etmek için gereken tüm adımları kapsar.

---

## 1. Gereksinimler

| Araç | Minimum Versiyon |
|------|-----------------|
| Node.js | 20.x |
| npm | 10.x |
| Git | Herhangi |
| Supabase Hesabı | — |
| Vercel Hesabı | — |
| Anthropic API Key | — |

---

## 2. Proje Kurulumu (Local)

```bash
# 1. Repoyu klonla
git clone https://github.com/[org]/harcirah-sistemi.git
cd harcirah-sistemi

# 2. Paketleri kur
npm install

# 3. Playwright browserları kur (E2E testler için)
npx playwright install chromium

# 4. Ortam değişkenlerini oluştur
cp .env.example .env.local
```

`.env.local` dosyasını aşağıdaki değerlerle doldur:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BM...
VAPID_PRIVATE_KEY=xxx...
VAPID_EMAIL=mailto:admin@t3vakfi.org
ANTHROPIC_API_KEY=sk-ant-...
CRON_SECRET=gizli-bir-sifre-yaz
```

```bash
# 5. Local'de çalıştır
npm run dev
# → http://localhost:3000
```

---

## 3. Supabase Kurulumu

### 3.1 Yeni Proje Oluştur
1. [supabase.com](https://supabase.com) → New Project
2. Proje adı: `tamga-production`
3. Database password'ü kaydet (bir daha göremezsin)
4. Region: `eu-central-1` (Frankfurt — Türkiye'ye en yakın)

### 3.2 Migration'ları Çalıştır
Supabase Dashboard → **SQL Editor** → sırasıyla çalıştır:

```
supabase/migrations/ klasöründeki tüm .sql dosyalarını
sıra numarasına göre (eski → yeni) çalıştır.
```

> ⚠️ Önemli: Her migration'dan sonra hata yoksa bir sonrakine geç.

### 3.3 Kritik Kolonları Kontrol Et
Aşağıdaki SQL ile eksik kolonları ekle:

```sql
-- Fiş sistemi kolonları
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS eski_fis boolean DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS manuel_giris boolean DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS fis_hash text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS kategori_detay jsonb;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_by uuid references profiles(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- Profil kolonları
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_modu boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_vekil_id uuid references profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_baslangic timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_bitis timestamptz;

-- Vekalet tablosu
CREATE TABLE IF NOT EXISTS vekalet_atamalari (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vekil_user_id uuid REFERENCES profiles(id),
  asil_il text NOT NULL,
  bolge text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Taslak tablosu
CREATE TABLE IF NOT EXISTS expense_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  form_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_drafts_user_id_idx ON expense_drafts(user_id);
```

### 3.4 RLS Politikalarını Ekle

```sql
-- Muhasebe policy
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muhasebe_select_payment_expenses" ON public.expenses;
CREATE POLICY "muhasebe_select_payment_expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'muhasebe'
    )
    AND status IN ('approved_koord', 'paid')
  );
```

### 3.5 Storage Bucket Oluştur
Supabase → **Storage** → New Bucket:
- Name: `receipts`
- Public: ❌ Hayır (private)
- File size limit: 10MB
- Allowed types: `image/jpeg, image/png, image/webp, application/pdf`

### 3.6 VAPID Anahtarları Oluştur
```bash
# Local'de çalıştır
npx web-push generate-vapid-keys
```
Çıkan değerleri `.env.local` ve Vercel'e ekle.

---

## 4. Vercel Deploy

### 4.1 İlk Deploy
```bash
# Vercel CLI ile
npm i -g vercel
vercel login
vercel --prod
```

Veya GitHub'a push at → Vercel otomatik deploy eder (repo bağlıysa).

### 4.2 Environment Variables
Vercel Dashboard → Project → **Settings → Environment Variables**

Tüm `.env.local` değişkenlerini buraya ekle:

| Key | Environment |
|-----|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Production, Preview, Development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Production, Preview, Development |
| SUPABASE_SERVICE_ROLE_KEY | Production |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Production |
| VAPID_PRIVATE_KEY | Production |
| VAPID_EMAIL | Production |
| ANTHROPIC_API_KEY | Production |
| CRON_SECRET | Production |

### 4.3 Vercel Cron Jobs
`vercel.json` dosyasında tanımlı:
```json
{
  "crons": [
    { "path": "/api/cron/hatirlatma", "schedule": "0 9 * * *" },
    { "path": "/api/cron/aylik-ozet", "schedule": "0 8 1 * *" }
  ]
}
```
> ⚠️ Cron jobs Vercel Pro plan gerektirir.

---

## 5. GitHub Actions (E2E Testler)

### 5.1 Secrets Ekle
GitHub → Repository → **Settings → Secrets → Actions → New secret**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
VAPID_PRIVATE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_EMAIL
CRON_SECRET
PLAYWRIGHT_BASE_URL = https://[production-url]
TEST_USER_DENEYAP_EMAIL = fatma.celik@t3vakfi.org
TEST_USER_DENEYAP_PASSWORD = 123
TEST_USER_BOLGE_EMAIL = emrah.hekim@t3vakfi.org
TEST_USER_BOLGE_PASSWORD = 123
TEST_USER_KOORD_EMAIL = yuusf.iskender@t3vakfi.org
TEST_USER_KOORD_PASSWORD = 123
TEST_USER_MUHASEBE_EMAIL = muhlis.semiz@t3vakfi.org
TEST_USER_MUHASEBE_PASSWORD = 123
```

### 5.2 Test Çalıştırma
```bash
# Tüm testler
npm run test:e2e

# Sadece bir dosya
npx playwright test tests/e2e/auth.spec.ts

# Tarayıcı görünür şekilde (debug için)
npx playwright test --headed

# HTML rapor
npx playwright show-report
```

---

## 6. Test Kullanıcıları

| Rol | E-posta | Şifre | İl / Bölge |
|-----|---------|-------|------------|
| YK Başkanı | elvan.kuzucu@t3vakfi.org | 123 | — |
| Koordinatör | yuusf.iskender@t3vakfi.org | 123 | — |
| Muhasebe | muhlis.semiz@t3vakfi.org | 123 | — |
| Bölge (İç Anadolu) | emrah.hekim@t3vakfi.org | 123 | — |
| Bölge (Marmara) | nurkan.karabulut@t3vakfi.org | 123 | — |
| Bölge (Ege) | tevfik.ekin@t3vakfi.org | 123 | — |
| İl (Ankara) | ahmet.yilmaz@t3vakfi.org | 123 | Ankara |
| İl (İstanbul) | ayse.demir@t3vakfi.org | 123 | İstanbul |
| Deneyap (Ankara) | fatma.celik@t3vakfi.org | 123 | Ankara |
| Deneyap (İstanbul) | ali.oz@t3vakfi.org | 123 | İstanbul |

> ⚠️ Production'da tüm şifreleri değiştir!

---

## 7. Sık Karşılaşılan Sorunlar

### "Could not find column 'xxx'" hatası
Supabase'de migration çalıştırılmamış. Bölüm 3.3'teki SQL'i çalıştır.

### Push bildirimleri gelmiyor
- VAPID anahtarlarının doğru girildiğini kontrol et
- Supabase'de `push_subscriptions` tablosunun var olduğunu kontrol et
- Tarayıcıda bildirim izninin verildiğini kontrol et

### Fiş AI analizi çalışmıyor
- `ANTHROPIC_API_KEY` değişkeninin doğru olduğunu kontrol et
- Anthropic hesabında kredi olduğunu kontrol et

### E2E testler login'de takılıyor
- `.env.test` dosyasındaki şifrelerin doğru olduğunu kontrol et
- `npm run dev` çalışıyor mu kontrol et

### Vercel deploy sonrası beyaz ekran
- Vercel'de environment variables eksik olabilir
- Build loglarını kontrol et: Vercel → Deployments → Son deploy → View logs

---

## 8. Monitoring & Bakım

### Aylık Kontroller
- [ ] Supabase storage kullanımı (free: 1GB)
- [ ] Supabase DB boyutu (free: 500MB)
- [ ] Anthropic API kullanımı ve maliyeti
- [ ] GitHub Actions başarı oranı

### Backup (Free Plan)
Supabase free plan'da otomatik backup yok. Aylık manuel export:
Supabase → Settings → Database → **Download backup**

### Log Takibi
- Uygulama logları: Vercel → Functions → Logs
- DB logları: Supabase → Logs Explorer
- Sistem logları: TAMGA Admin Panel → /dashboard/admin/loglar

---

*Son güncelleme: Nisan 2026*

# TAMGA — Deployment Runbook

> Bu doküman, TAMGA projesini sıfırdan kurulum ve deploy etmek için gereken tüm adımları kapsar.

---

## 1. Gereksinimler

| Araç | Minimum Versiyon |
|------|-----------------|
| Node.js | 20.x |
| npm | 10.x |
| Git | Herhangi |
| Supabase Hesabı | — |
| Vercel Hesabı | — |
| Anthropic API Key | — |

---

## 2. Proje Kurulumu (Local)

```bash
# 1. Repoyu klonla
git clone https://github.com/[org]/harcirah-sistemi.git
cd harcirah-sistemi

# 2. Paketleri kur
npm install

# 3. Playwright browserları kur (E2E testler için)
npx playwright install chromium

# 4. Ortam değişkenlerini oluştur
cp .env.example .env.local
```

`.env.local` dosyasını aşağıdaki değerlerle doldur:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BM...
VAPID_PRIVATE_KEY=xxx...
VAPID_EMAIL=mailto:admin@t3vakfi.org
ANTHROPIC_API_KEY=sk-ant-...
CRON_SECRET=gizli-bir-sifre-yaz
```

```bash
# 5. Local'de çalıştır
npm run dev
# → http://localhost:3000
```

---

## 3. Supabase Kurulumu

### 3.1 Yeni Proje Oluştur
1. [supabase.com](https://supabase.com) → New Project
2. Proje adı: `tamga-production`
3. Database password'ü kaydet (bir daha göremezsin)
4. Region: `eu-central-1` (Frankfurt — Türkiye'ye en yakın)

### 3.2 Migration'ları Çalıştır
Supabase Dashboard → **SQL Editor** → sırasıyla çalıştır:

```
supabase/migrations/ klasöründeki tüm .sql dosyalarını
sıra numarasına göre (eski → yeni) çalıştır.
```

> ⚠️ Önemli: Her migration'dan sonra hata yoksa bir sonrakine geç.

### 3.3 Kritik Kolonları Kontrol Et
Aşağıdaki SQL ile eksik kolonları ekle:

```sql
-- Fiş sistemi kolonları
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS eski_fis boolean DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS manuel_giris boolean DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS fis_hash text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS kategori_detay jsonb;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS archived_by uuid references profiles(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- Profil kolonları
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_modu boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_vekil_id uuid references profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_baslangic timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS izin_bitis timestamptz;

-- Vekalet tablosu
CREATE TABLE IF NOT EXISTS vekalet_atamalari (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vekil_user_id uuid REFERENCES profiles(id),
  asil_il text NOT NULL,
  bolge text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Taslak tablosu
CREATE TABLE IF NOT EXISTS expense_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  form_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_drafts_user_id_idx ON expense_drafts(user_id);
```

### 3.4 RLS Politikalarını Ekle

```sql
-- Muhasebe policy
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muhasebe_select_payment_expenses" ON public.expenses;
CREATE POLICY "muhasebe_select_payment_expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'muhasebe'
    )
    AND status IN ('approved_koord', 'paid')
  );
```

### 3.5 Storage Bucket Oluştur
Supabase → **Storage** → New Bucket:
- Name: `receipts`
- Public: ❌ Hayır (private)
- File size limit: 10MB
- Allowed types: `image/jpeg, image/png, image/webp, application/pdf`

### 3.6 VAPID Anahtarları Oluştur
```bash
# Local'de çalıştır
npx web-push generate-vapid-keys
```
Çıkan değerleri `.env.local` ve Vercel'e ekle.

---

## 4. Vercel Deploy

### 4.1 İlk Deploy
```bash
# Vercel CLI ile
npm i -g vercel
vercel login
vercel --prod
```

Veya GitHub'a push at → Vercel otomatik deploy eder (repo bağlıysa).

### 4.2 Environment Variables
Vercel Dashboard → Project → **Settings → Environment Variables**

Tüm `.env.local` değişkenlerini buraya ekle:

| Key | Environment |
|-----|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Production, Preview, Development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Production, Preview, Development |
| SUPABASE_SERVICE_ROLE_KEY | Production |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Production |
| VAPID_PRIVATE_KEY | Production |
| VAPID_EMAIL | Production |
| ANTHROPIC_API_KEY | Production |
| CRON_SECRET | Production |

### 4.3 Vercel Cron Jobs
`vercel.json` dosyasında tanımlı:
```json
{
  "crons": [
    { "path": "/api/cron/hatirlatma", "schedule": "0 9 * * *" },
    { "path": "/api/cron/aylik-ozet", "schedule": "0 8 1 * *" }
  ]
}
```
> ⚠️ Cron jobs Vercel Pro plan gerektirir.

---

## 5. GitHub Actions (E2E Testler)

### 5.1 Secrets Ekle
GitHub → Repository → **Settings → Secrets → Actions → New secret**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
VAPID_PRIVATE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_EMAIL
CRON_SECRET
PLAYWRIGHT_BASE_URL = https://[production-url]
TEST_USER_DENEYAP_EMAIL = fatma.celik@t3vakfi.org
TEST_USER_DENEYAP_PASSWORD = 123
TEST_USER_BOLGE_EMAIL = emrah.hekim@t3vakfi.org
TEST_USER_BOLGE_PASSWORD = 123
TEST_USER_KOORD_EMAIL = yuusf.iskender@t3vakfi.org
TEST_USER_KOORD_PASSWORD = 123
TEST_USER_MUHASEBE_EMAIL = muhlis.semiz@t3vakfi.org
TEST_USER_MUHASEBE_PASSWORD = 123
```

### 5.2 Test Çalıştırma
```bash
# Tüm testler
npm run test:e2e

# Sadece bir dosya
npx playwright test tests/e2e/auth.spec.ts

# Tarayıcı görünür şekilde (debug için)
npx playwright test --headed

# HTML rapor
npx playwright show-report
```

---

## 6. Test Kullanıcıları

| Rol | E-posta | Şifre | İl / Bölge |
|-----|---------|-------|------------|
| YK Başkanı | elvan.kuzucu@t3vakfi.org | 123 | — |
| Koordinatör | yuusf.iskender@t3vakfi.org | 123 | — |
| Muhasebe | muhlis.semiz@t3vakfi.org | 123 | — |
| Bölge (İç Anadolu) | emrah.hekim@t3vakfi.org | 123 | — |
| Bölge (Marmara) | nurkan.karabulut@t3vakfi.org | 123 | — |
| Bölge (Ege) | tevfik.ekin@t3vakfi.org | 123 | — |
| İl (Ankara) | ahmet.yilmaz@t3vakfi.org | 123 | Ankara |
| İl (İstanbul) | ayse.demir@t3vakfi.org | 123 | İstanbul |
| Deneyap (Ankara) | fatma.celik@t3vakfi.org | 123 | Ankara |
| Deneyap (İstanbul) | ali.oz@t3vakfi.org | 123 | İstanbul |

> ⚠️ Production'da tüm şifreleri değiştir!

---

## 7. Sık Karşılaşılan Sorunlar

### "Could not find column 'xxx'" hatası
Supabase'de migration çalıştırılmamış. Bölüm 3.3'teki SQL'i çalıştır.

### Push bildirimleri gelmiyor
- VAPID anahtarlarının doğru girildiğini kontrol et
- Supabase'de `push_subscriptions` tablosunun var olduğunu kontrol et
- Tarayıcıda bildirim izninin verildiğini kontrol et

### Fiş AI analizi çalışmıyor
- `ANTHROPIC_API_KEY` değişkeninin doğru olduğunu kontrol et
- Anthropic hesabında kredi olduğunu kontrol et

### E2E testler login'de takılıyor
- `.env.test` dosyasındaki şifrelerin doğru olduğunu kontrol et
- `npm run dev` çalışıyor mu kontrol et

### Vercel deploy sonrası beyaz ekran
- Vercel'de environment variables eksik olabilir
- Build loglarını kontrol et: Vercel → Deployments → Son deploy → View logs

---

## 8. Monitoring & Bakım

### Aylık Kontroller
- [ ] Supabase storage kullanımı (free: 1GB)
- [ ] Supabase DB boyutu (free: 500MB)
- [ ] Anthropic API kullanımı ve maliyeti
- [ ] GitHub Actions başarı oranı

### Backup (Free Plan)
Supabase free plan'da otomatik backup yok. Aylık manuel export:
Supabase → Settings → Database → **Download backup**

### Log Takibi
- Uygulama logları: Vercel → Functions → Logs
- DB logları: Supabase → Logs Explorer
- Sistem logları: TAMGA Admin Panel → /dashboard/admin/loglar

---

*Son güncelleme: Nisan 2026*
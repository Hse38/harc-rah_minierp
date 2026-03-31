# TAMGA – Proje Dokümantasyonu

## 1. PROJE GENEL BİLGİLER

### Proje adı, amacı, hedef kitle
- **Proje adı:** TAMGA (paket adı: harcirah-sistemi)
- **Amaç:** T3 Vakfı harcama taleplerinin (Deneyap / il / bölge hiyerarşisi içinde) oluşturulması, bölge ve koordinatör onayı, muhasebe ödeme takibi ve raporlaması. Rol bazlı erişim, bildirimler ve web push ile süreç yönetimi.
- **Hedef kitle:** T3 Vakfı iç kullanıcıları: Deneyap sorumluları, il sorumluları, bölge sorumluları, koordinatör (TÇK), muhasebe, YK başkanı, admin.

### Canlı URL
- Canlı URL proje ayarlarına göre (örn. Vercel) tanımlanır. Örnek: `minierp.ekinciteknoloji.xyz` veya kurumsal domain.

### Tech stack (paketler + versiyonlar)
- **Next.js:** ^16.1.6 (App Router, Turbopack)
- **React / React-DOM:** ^19.2.4
- **Supabase:** @supabase/ssr ^0.5.2, @supabase/supabase-js ^2.45.4
- **UI / stil:** tailwindcss ^3.4.1, tailwindcss-animate ^1.0.7, class-variance-authority ^0.7.0, clsx ^2.1.1, tailwind-merge ^2.5.4
- **Radix UI:** @radix-ui/react-dialog ^1.1.2, @radix-ui/react-label ^2.1.0, @radix-ui/react-select ^2.1.2, @radix-ui/react-slot ^1.1.0, @radix-ui/react-tabs ^1.1.1
- **İkonlar:** lucide-react ^0.460.0
- **Bildirim / toast:** sonner ^1.7.0
- **Grafik:** recharts ^2.13.3
- **Excel export:** exceljs ^4.4.0
- **Web Push:** web-push ^3.6.7
- **AI (fiş okuma):** @anthropic-ai/sdk ^0.32.1
- **Görsel:** next/image, sharp ^0.34.5 (dev)
- **Diğer:** TypeScript ^5, ESLint, PostCSS, Autoprefixer

---

## 2. KULLANICI ROLLERİ

### deneyap (Deneyap Sorumlusu)
- **Erişebildiği sayfalar:** `/dashboard/deneyap` (dashboard + liste), `/dashboard/deneyap/yeni`, `/dashboard/deneyap/duzenle/[id]`, `/dashboard/profil`
- **Yetkiler:** Kendi il/bölgesine bağlı; sadece kendi oluşturduğu harcamaları görür.
- **Yapabildiği işlemler:** Yeni harcama ekleme (fiş yükleme, AI fiş okuma, kategori, tutar, açıklama), harcama düzenleme (henüz bölge onayına çıkmamışsa), harcama listesi ve dashboard görüntüleme.

### il (İl Sorumlusu)
- **Erişebildiği sayfalar:** `/dashboard/il` (dashboard + liste), `/dashboard/il/yeni`, `/dashboard/profil`
- **Yetkiler:** İl bazlı; kendi ilindeki deneyap harcamalarına benzer işlemler.
- **Yapabildiği işlemler:** Yeni harcama ekleme, kendi harcamalarını listeleme ve dashboard görüntüleme.

### bolge (Bölge Sorumlusu)
- **Erişebildiği sayfalar:** `/dashboard/bolge` (dashboard, bekleyen, tamamlanan), `/dashboard/bolge/yeni`, `/dashboard/profil`
- **Yetkiler:** Bölge bazlı; kendi bölgesindeki harcamaları görür ve onaylar.
- **Yapabildiği işlemler:** Bekleyen harcamaları listeleme, onaylama, reddetme, uyarılı onay (not ile), yeni harcama ekleme (kendi adına), tamamlanan listesi.

### koordinator (Koordinatör / TÇK)
- **Erişebildiği sayfalar:** `/dashboard/koordinator` (dashboard, bekleyen, tamamlanan, limitler), `/dashboard/yk` (YK ile aynı menüye erişir), `/dashboard/profil`
- **Yetkiler:** Tüm bölgelerden gelen “bölge onaylı” harcamaları görür; limit yönetimi.
- **Yapabildiği işlemler:** Koordinatör onayı bekleyen listesi, onaylama, reddetme, bölge limitleri (region_limits) görüntüleme/güncelleme, limit aşımında YK/Koordinatöre bildirim tetikleme.

### muhasebe
- **Erişebildiği sayfalar:** `/dashboard/muhasebe` (ödeme bekleyen, ödenen, export), `/dashboard/profil`
- **Yetkiler:** Koordinatör onaylı harcamaları görür; ödeme işaretleme ve export.
- **Yapabildiği işlemler:** Ödeme bekleyen listesi, tekli/toplu “ödendi” işaretleme, Excel export, export logları.

### yk (YK Başkanı)
- **Erişebildiği sayfalar:** `/dashboard/yk` (genel, bölgeler, tüm harcamalar), `/dashboard/koordinator` (aynı menü), `/dashboard/profil`
- **Yetkiler:** Tüm harcamaları ve bölge özetlerini görür; limit uyarılarını alır.
- **Yapabildiği işlemler:** Genel dashboard, bölge bazlı harita (TurkiyeHaritasi), tüm harcamalar listesi, limit uyarı bildirimleri.

### admin
- **Erişebildiği sayfalar:** `/dashboard/admin`, `/dashboard/admin/kullanicilar`, `/dashboard/admin/kullanicilar/yeni`, `/dashboard/admin/kullanicilar/[id]`, `/dashboard/admin/harcamalar`, `/dashboard/admin/duyurular`, `/dashboard/admin/duyurular/yeni`, `/dashboard/admin/loglar`, `/dashboard/profil`
- **Yetkiler:** Tüm kullanıcılar, harcamalar, duyurular ve sistem logları üzerinde tam yetki.
- **Yapabildiği işlemler:** Kullanıcı listesi, yeni kullanıcı oluşturma, kullanıcı düzenleme (profil, rol, il, bölge, IBAN, telefon), şifre sıfırlama, hesap askıya alma/askıyı kaldırma, hesap silme; harcama listesi ve detay; duyuru CRUD ve hedef rol/bölge; sistem loglarını görüntüleme.

---

## 3. TÜM SAYFALAR VE ÖZELLİKLER

| URL path | Ne işe yarıyor | Özellikler |
|----------|----------------|------------|
| `/` | Ana sayfa | Giriş yapmamışsa yönlendirme; giriş varsa `/dashboard` |
| `/login` | Giriş | E-posta/şifre, şifre göster/gizle, T3 logo, rol bazlı yönlendirme |
| `/dashboard` | Dashboard girişi | Role göre ilgili rol sayfasına yönlendirir (deneyap/il/bolge/koordinator/muhasebe/yk) |
| `/dashboard/deneyap` | Deneyap ana sayfa | Tab: dashboard (grafik, özet), list (harcamalarım); harcama kartları, durum rozetleri |
| `/dashboard/deneyap/yeni` | Yeni harcama | Form: tutar, kategori, açıklama, fiş yükleme, AI fiş okuma; bölge sorumlusuna bildirim |
| `/dashboard/deneyap/duzenle/[id]` | Harcama düzenle | Sadece uygun durumdaysa düzenleme; kaydet, iptal |
| `/dashboard/il` | İl ana sayfa | Dashboard + liste (il sorumlusu) |
| `/dashboard/il/yeni` | İl yeni harcama | Yeni harcama formu (il sorumlusu) |
| `/dashboard/bolge` | Bölge ana sayfa | Tab: dashboard, pending (bekleyen), done (onaylanan/reddedilen); onay/red/uyarılı onay, not modalı |
| `/dashboard/bolge/yeni` | Bölge yeni harcama | Bölge sorumlusu adına yeni harcama |
| `/dashboard/koordinator` | Koordinatör ana sayfa | Tab: dashboard, awaiting (TÇK onayı bekleyen), completed, limits (bölge limitleri); onay/red, limit güncelleme |
| `/dashboard/muhasebe` | Muhasebe ana sayfa | Tab: awaiting (ödeme bekleyen), paid, export; tekli/toplu ödendi, Excel export, export geçmişi |
| `/dashboard/yk` | YK ana sayfa | Tab: genel, bölgeler (harita), harcamalar; TurkiyeHaritasi, tüm harcamalar listesi |
| `/dashboard/profil` | Profil | Ad, dil (tr/az/ky), bildirim tercihleri, IBAN, telefon; push izni, oturumu kapat |
| `/dashboard/admin` | Admin dashboard | Özet istatistikler, loglar önizleme |
| `/dashboard/admin/kullanicilar` | Kullanıcı listesi | Rol/bölge arama, kullanıcı listesi, yeni kullanıcı / düzenle linkleri |
| `/dashboard/admin/kullanicilar/yeni` | Yeni kullanıcı | E-posta, şifre, ad, rol, il, bölge; Supabase Auth + profile oluşturma |
| `/dashboard/admin/kullanicilar/[id]` | Kullanıcı düzenle | Avatar kartı, temel bilgiler, iletişim; şifre sıfırla, hesap durumu (askıya al), hesap sil (onay modal) |
| `/dashboard/admin/harcamalar` | Admin harcamalar | Tüm harcamalar listesi, filtre, detay, reddetme gerekçesi |
| `/dashboard/admin/duyurular` | Duyuru listesi | Duyuru listesi, aktif/pasif, detay, yeni duyuru linki |
| `/dashboard/admin/duyurular/yeni` | Yeni duyuru | Başlık, içerik, hedef roller, hedef bölge, web push ile gönderim |
| `/dashboard/admin/loglar` | Sistem logları | system_logs tablosu, aksiyon/filtre |

Ekran görüntüsü: Proje içinde ayrıca tutulmuyor; gerekirse manuel eklenebilir.

---

## 4. ONAY AKIŞI

1. **Talep oluşturma (Deneyap / İl / Bölge)**  
   - Kullanıcı “Yeni harcama” ile formu doldurur (fiş yükleme, isteğe bağlı AI okuma).  
   - Kayıt: `expenses` tablosuna `status: pending_bolge` ile yazılır.  
   - **Bildirim:** İlgili bölge sorumlusuna (toRole: bolge, bolge: expense.bolge) uygulama içi + web push.

2. **Bölge onayı**  
   - Bölge sorumlusu bekleyen listeden onaylar / reddeder / “uyarılı onay” (not ile) verir.  
   - Onay: `status → approved_bolge`, `reviewed_by_bolge`, `reviewed_at_bolge`; isteğe bağlı `bolge_warning`, `bolge_note`.  
   - **Bildirim:** Koordinatöre (toRole: koordinator) “bölge onaylandı, TÇK onayı bekleniyor”. Uyarılı onayda ayrıca personele (recipientId: submitter_id) not ile bildirim.  
   - Red: `status → rejected_bolge`. **Bildirim:** Talep sahibine (recipientId: submitter_id) red bildirimi.

3. **Koordinatör (TÇK) onayı**  
   - Koordinatör “bekleyen” listeden onaylar veya reddeder.  
   - Onay: `status → approved_koord`.  
   - **Bildirim:** Muhasebeye “ödeme bekliyor”; personele “onaylandı, ödeme yapılacak”. Limit aşımı varsa koordinatör ve YK’ya limit uyarısı.  
   - Red: `status → rejected_koord`. **Bildirim:** Talep sahibine red.

4. **Muhasebe – ödeme**  
   - Muhasebe “ödeme bekleyen” listesinden tekli veya toplu “ödendi” işaretler.  
   - `status → paid`.  
   - **Bildirim:** Talep sahibine “ödemeniz gerçekleşti”.

Tüm onay/red/ödeme adımlarında isteğe bağlı olarak `POST /api/system-log` ile `system_logs` kaydı oluşturulur.

---

## 5. BİLDİRİM SİSTEMİ

### Uygulama içi bildirim
- **Kaynak:** `notifications` tablosu (recipient_id, expense_id, message, is_read).  
- **Okuma:** Topbar’daki zil ikonu (NotificationBell) kullanıcıya ait okunmamış kayıtları çeker; tıklanınca okundu işaretlenir ve ilgili harcama sayfasına yönlendirir (role göre dashboard path).  
- **Yazma:** `sendNotification()` çağrıldığında (genelde `/api/notify` üzerinden) ilgili kayıt insert edilir (expense_id varsa).

### Web push
- **Abonelik:** `push_subscriptions` tablosunda user_id + subscription (JSON). Tarayıcıda izin sonrası PushNotificationSetup / send-push ile kaydedilir.  
- **Gönderim:** `sendNotification()` içinde kullanıcının `notification_prefs.push_enabled` ve subscription’ı kontrol edilir; web-push (VAPID) ile `title`, `body`, `url` gönderilir.  
- **Tetikleyici:** Aynı `sendNotification` / `sendNotificationToRole` çağrıları hem uygulama içi kayıt hem web push için kullanılır.

### Hangi olayda kime bildirim (özet tablo)

| Olay | Alıcı | Mesaj / Amaç |
|------|--------|----------------|
| Yeni harcama (pending_bolge) | Bölge sorumlusu (role=bolge, bolge=e.bolge) | Yeni harcama bölge onayı bekliyor |
| Bölge onayı (approved_bolge) | Koordinatör | Bölge onaylandı, TÇK onayı bekleniyor |
| Bölge uyarılı onay | Koordinatör + Talep sahibi | Uyarılı onay; personele not |
| Bölge reddi | Talep sahibi | Bölge sorumlusu reddetti |
| Koordinatör onayı (approved_koord) | Muhasebe + Talep sahibi | Ödemeye hazır; personel onaylandı |
| Limit aşımı (koord onay sonrası) | Koordinatör + YK | Limit uyarısı |
| Koordinatör reddi | Talep sahibi | Koordinatör reddetti |
| Ödendi (paid) | Talep sahibi | Ödemeniz gerçekleşti |
| Yeni duyuru (admin) | Seçilen roller (hedef kitle) | Duyuru metni (web push) |

---

## 6. AI ÖZELLİKLERİ

### Fiş okuma
- **Nerede:** Yeni harcama formlarında (Deneyap/İl/Bölge) fiş yükleme alanı; “Fişi oku” benzeri akışta görsel API’ye gönderilir.
- **Endpoint:** `POST /api/analyze-receipt`. Body: `base64` + `mediaType` veya `imageUrl`.
- **İşleyiş:** `@/lib/claude-vision` içinde Anthropic API ile görsel analiz; Türkçe fiş için JSON çıktı (tutar, tarih, işletme, kategori, açıklama). Kategori sabit liste: Ulaşım, Konaklama, Yemek, Malzeme, Diğer.
- **Kullanılan model:** Claude Sonnet 4 (claude-sonnet-4-20250514), max_tokens 500.

### Planlanan AI özellikleri
- Dokümanda ayrı bir “planlanan AI roadmap” metni yok; ileride eklenebilir (örn. otomatik kategorileme, anomali uyarısı).

---

## 7. VERİTABANI

Tablolar kod ve mevcut migration’lardan çıkarılmıştır. İlk şema (expenses, notifications, profiles, announcements, region_limits, system_logs) Supabase tarafında başka migration veya SQL ile oluşturulmuş olabilir.

### profiles
- id (uuid, PK), full_name, role, il, bolge, iban, phone, created_at, language (tr|az|ky), notification_prefs (jsonb: expense_approved, expense_rejected, expense_pending, limit_warning, push_enabled).  
- İlişki: auth.users(id) ile uyumlu.

### expenses
- id, expense_number, submitter_id, submitter_name, iban, il, bolge, expense_type, amount, description, receipt_url, ai_analysis, status (pending_bolge | approved_bolge | rejected_bolge | pending_koord | approved_koord | rejected_koord | paid | deleted), bolge_note, bolge_warning, reviewed_by_bolge, reviewed_by_koord, reviewed_at_bolge, reviewed_at_koord, created_at.  
- İlişkiler: submitter_id → profiles/auth.

### notifications
- id, recipient_id, expense_id, message, is_read, created_at (ve muhtemelen recipient_role).  
- İlişki: recipient_id → profiles.

### announcements
- id, title, content, created_at, created_by, target_roles (array), target_bolge, is_active.  
- Realtime açık; duyuru listesi rol/bölge filtresi ile çekilir.

### announcement_reads
- id, user_id, announcement_id, read_at. UNIQUE(user_id, announcement_id).  
- RLS: SELECT/INSERT sadece auth.uid() = user_id.

### region_limits
- Bölge bazlı limit bilgisi (slug, limit değeri vb.). RLS: authenticated SELECT.

### system_logs
- id, user_id, user_name, action, target_type, target_id, details (jsonb), created_at.  
- Admin tarafından okunur; insert client’tan POST /api/system-log ile.

### export_logs
- id, exported_by, export_date, start_date, end_date, record_count.  
- RLS: SELECT/INSERT auth.uid() = exported_by.

### push_subscriptions
- id, user_id, subscription (jsonb), updated_at. UNIQUE(user_id).  
- RLS: ALL for authenticated WHERE auth.uid() = user_id.

---

## 8. API ENDPOINT'LERİ

| Method | Route | Açıklama | Request / Response (özet) |
|--------|--------|----------|----------------------------|
| GET | /api/announcements | Giriş yapmış kullanıcıya rol/bölgeye göre duyurular | - / JSON array (id, title, content, created_at) |
| GET | /api/dashboard | Rol/bolge’ye göre dashboard istatistikleri | Query: role, bolge / JSON |
| GET | /api/export-excel | Seçili harcama id’leri için Excel indirme | Query: ids / Excel dosyası |
| POST | /api/analyze-receipt | Fiş görselinden AI ile alan çıkarma | Body: base64, mediaType veya imageUrl / JSON (tutar, tarih, isletme, kategori, aciklama) |
| POST | /api/notify | Tek kullanıcı veya role bildirim + web push | Body: recipientId+recipientRole veya toRole (+ bolge); message, pushTitle, pushBody, pushUrl; expenseId? / { ok: true } |
| POST | /api/send-push | Push aboneliği kaydetme (client) | Body: subscription / JSON |
| POST | /api/system-log | İşlem logu yazma | Body: action, target_type, target_id, details? / { ok: true } |
| GET | /api/admin/stats | Admin özet istatistikler | - / JSON |
| GET | /api/admin/users | Admin kullanıcı listesi | Query: role?, bolge?, q? / JSON array (id, full_name, role, il, bolge, phone, email, last_sign_in_at) |
| GET | /api/admin/users/[id] | Admin tek kullanıcı detay | - / JSON (profil + email + is_suspended) |
| PATCH | /api/admin/users/[id] | Admin kullanıcı güncelleme | Body: full_name?, role?, il?, bolge?, iban?, phone? / { success: true } |
| POST | /api/admin/users/[id]/reset-password | Admin şifre sıfırlama | Body: new_password / - |
| POST | /api/admin/users/[id]/suspend | Admin hesap askıya al/kaldır | Body: suspend (boolean) / - |
| POST | /api/admin/users/[id]/delete | Admin hesap silme | - / { success: true } |
| POST | /api/admin/create-user | Admin yeni kullanıcı | Body: email, password, full_name, role, il?, bolge? / - |
| GET | /api/admin/expenses | Admin harcama listesi | Query: status?, q? / JSON array |
| PATCH | /api/admin/expenses/[id] | Admin harcama güncelleme | Body: status?, vb. / - |
| DELETE | /api/admin/expenses/[id] | Admin harcama silme | - / - |
| GET | /api/admin/announcements | Admin duyuru listesi | - / JSON array |
| POST | /api/admin/announcements | Admin yeni duyuru | Body: title, content, target_roles, target_bolge?, is_active / - |
| PATCH | /api/admin/announcements/[id] | Admin duyuru güncelleme (aktif/pasif) | Body: is_active? / - |

---

## 9. COMPONENT'LER

- **layout:** topbar, dashboard-sidebar, bottom-nav, notification-bell, announcement-topbar-button, announcement-banner, push-permission-banner, PushNotificationSetup.  
- **ui:** button, input, label, select, card, badge, dialog, sheet, tabs, textarea.  
- **expenses:** expense-card, expense-detail-modal, yk-expense-detail-modal, receipt-uploader, receipt-lightbox, ai-analysis-box, status-badge.  
- **approval:** approval-modal, warn-modal.  
- **dashboard:** DeneyapChart, KoordinatorCharts, AnalyticsChart, status-pie, region-chart, metric-card, MetricCard, StatCard, DashboardHeader, TurkiyeHaritasi.  
- **ServiceWorkerRegister:** Web push için service worker kaydı.

---

## 10. TAMAMLANAN ÖZELLİKLER ✅

- Rol bazlı giriş ve sayfa yetkilendirme (middleware)
- Deneyap / İl / Bölge: yeni harcama, düzenleme, listeleme, dashboard
- Bölge: bekleyen onay/red/uyarılı onay, bildirim
- Koordinatör: TÇK onay/red, limit yönetimi, limit uyarısı bildirimi
- Muhasebe: ödeme bekleyen, ödendi işaretleme (tekli/toplu), Excel export, export log
- YK: genel dashboard, bölge haritası (TurkiyeHaritasi), tüm harcamalar
- Profil: dil (tr/az/ky), bildirim tercihleri, push aboneliği
- Uygulama içi bildirim (zil) ve web push (VAPID)
- Duyurular: rol/bölge hedefli listeleme, okundu takibi (announcement_reads), topbar drawer, realtime
- Fiş okuma (Claude Vision), kategori normalization
- Admin: kullanıcı CRUD, şifre sıfırlama, askıya alma, hesap silme, harcama listesi/detay, duyuru CRUD, sistem logları
- Login: şifre göster/gizle
- Çok dilli arayüz (i18n: tr, az, ky)

---

## 11. EKSİK / DEVAM EDEN ÖZELLİKLER 🔄

- Middleware için “proxy” convention uyarısı (Next.js 16) – ileride proxy’e geçiş
- Veritabanı: expenses, notifications, profiles, announcements, system_logs tablolarının ilk CREATE migration’ları bu repoda yok; Supabase’de mevcut şema varsayılıyor
- Bildirim tercihleri (notification_prefs) filtreleme: şu an tüm bildirimler gönderiliyor; “expense_approved” vb. bayraklara göre filtre uygulanabilir
- Planlanan AI özellikleri için ayrı bir roadmap dokümanı eklenebilir
- Eksiksiz E2E test seti ve deployment runbook’u ayrıca yazılabilir

---

## 12. DEPLOYMENT

### Vercel
- Proje Vercel’e bağlanır; `next build` (Turbopack) kullanılır. Ayrı bir `vercel.json` dosyası repoda belirtilmedi.

### Environment variables (key isimleri; değerler ortamda tutulur)
- **NEXT_PUBLIC_SUPABASE_URL** – Supabase proje URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** – Supabase anon key
- **SUPABASE_SERVICE_ROLE_KEY** – Admin/service role (server-only)
- **NEXT_PUBLIC_VAPID_PUBLIC_KEY** – Web push VAPID public key
- **VAPID_PRIVATE_KEY** – Web push VAPID private key
- **VAPID_EMAIL** – VAPID contact (örn. mailto:admin@t3vakfi.org)
- **ANTHROPIC_API_KEY** – Fiş okuma (Claude) API key

### Supabase
- Supabase projesi; Auth (email/password), Realtime (announcements vb.), RLS kullanılır.  
- Migrations: `supabase/migrations` altında announcement_reads, push_subscriptions, export_logs, profiles_language_notification_prefs, profiles_add_phone, region_limits_rls, clean_all_for_reseed.  
- İlk tablo şemaları (profiles, expenses, notifications, announcements, region_limits, system_logs) proje kurulumunda SQL veya dashboard ile oluşturulmuş kabul edilir.

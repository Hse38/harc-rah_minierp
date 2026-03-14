-- DB temizleme: Tüm istekler, bildirimler, export kayıtları, abonelikler ve profil verilerini siler.
-- Auth kullanıcılarını Supabase Dashboard > Authentication > Users üzerinden manuel silin
-- veya scripts/seed-users.ts çalıştırmadan önce scripts/clean-auth-users.ts ile silin.

-- Sıra: FK bağımlılıkları nedeniyle önce alt tablolar
DELETE FROM notifications;
DELETE FROM export_logs;
DELETE FROM expenses;
DELETE FROM push_subscriptions;
DELETE FROM region_limits;

-- En son profiller (auth.users ile eşleşir; auth tarafını Dashboard'dan sileceksiniz)
DELETE FROM profiles;

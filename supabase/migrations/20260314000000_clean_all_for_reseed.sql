-- DB temizleme: İstekler, bildirimler ve profilleri siler.
-- (export_logs, push_subscriptions yoksa atla.)

DELETE FROM notifications;
DELETE FROM expenses;
DELETE FROM region_limits;
DELETE FROM profiles;

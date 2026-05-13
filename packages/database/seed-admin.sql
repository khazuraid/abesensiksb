-- =====================================================================
-- Seed admin user.
-- Email   : admin@admin.com
-- Password: admin123
--
-- Hash bcrypt cost=10 dari "admin123" sudah di-hardcode di INSERT.
-- Setelah login PERTAMA KALI, segera ganti password lewat UI.
--
-- Cara pakai:
--   psql $DATABASE_URL < seed-admin.sql
-- atau paste isinya ke Coolify Postgres terminal.
-- =====================================================================

INSERT INTO "users" ("email", "password", "name", "role")
VALUES (
    'admin@admin.com',
    '$2b$10$b7jhDWhWBIz6YlWWFT5EnOd4MKWYyZwIvE2Fwxk7wUm7GpEp9jsmS',
    'Administrator',
    'ADMIN'
)
ON CONFLICT ("email") DO NOTHING;

-- Cek hasil:
SELECT id, email, name, role FROM "users" WHERE email = 'admin@admin.com';

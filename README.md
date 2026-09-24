# Member Area — Meta Romance

Aplikasi Next.js untuk autentikasi member, katalog, checkout, upload bukti
pembayaran, pemberian akses produk, event, dan dashboard admin.

- Production: `https://member.metaromance.web.id`
- Website utama: `https://metaromance.web.id`
- Database/Auth/Storage: Supabase
- Email Auth: Supabase Auth melalui Brevo SMTP
- Email transaksi aplikasi: Brevo Transactional Email API

## Menjalankan lokal

```bash
cd member
pnpm install
cp .env.example .env.local
pnpm dev
```

Development berjalan di `http://localhost:3001`. Tanpa `BREVO_API_KEY`,
email aplikasi dikirim ke SMTP lokal/Mailpit di `127.0.0.1:55325`.

## Setup Supabase cloud

1. Buat project Supabase production.
2. Jalankan SQL berikut melalui SQL Editor, sesuai urutan:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_site_contents.sql`
   - `supabase/migrations/0003_guest_checkout.sql`
   - `supabase/migrations/0004_updated_at_triggers.sql`
   - `supabase/migrations/0005_admin_read_policies.sql`
   - `supabase/migrations/0006_security_hardening.sql`
   - `supabase/migrations/0007_admin_role_management.sql`
   - `supabase/seed.sql`
3. Jalankan `supabase/tests/smoke.sql` untuk verifikasi tabel, seed, bucket, dan RLS.
4. Isi URL, publishable key, dan secret key Supabase di Vercel.
5. Authentication → URL Configuration:
   - Site URL: `https://member.metaromance.web.id`
   - Redirect URL: `https://member.metaromance.web.id/auth/confirm`
   - Local redirect: `http://localhost:3001/auth/confirm`
6. Aktifkan Email provider dan Confirm Email.

## Setup Brevo

### Domain dan sender

1. Brevo → Settings → Senders, Domains & Dedicated IPs → Domains.
2. Tambahkan `metaromance.web.id`.
3. Pasang Brevo Code, DKIM, dan DMARC yang diberikan Brevo ke DNS.
4. Buat sender `Meta Romance <noreply@metaromance.web.id>`.

### Supabase Auth melalui Brevo SMTP

Di Brevo → Settings → SMTP & API, buat SMTP key. Lalu isi Supabase
Authentication → Emails → SMTP Settings:

```text
Host         smtp-relay.brevo.com
Port         587
Username     SMTP Login dari Brevo
Password     SMTP Key dari Brevo (bukan API key)
Sender name  Meta Romance
Sender email noreply@metaromance.web.id
```

### Email transaksi aplikasi melalui Brevo API

Buat API key Brevo dan simpan sebagai `BREVO_API_KEY` di Vercel. Jalur ini
dipakai untuk email order, approval/rejection, akses produk, dan event.

## Environment Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

BREVO_API_KEY=xkeysib-...
EMAIL_FROM="Meta Romance <noreply@metaromance.web.id>"

NEXT_PUBLIC_APP_URL=https://member.metaromance.web.id
NEXT_PUBLIC_MAIN_SITE_URL=https://metaromance.web.id
```

`SUPABASE_SERVICE_ROLE_KEY` dan `BREVO_API_KEY` adalah server-only. Jangan
memberi prefix `NEXT_PUBLIC_`, jangan menaruhnya di website utama, dan jangan
commit `.env.local`.

## Verifikasi production

1. Register akun baru dan pastikan email konfirmasi masuk melalui Brevo SMTP.
2. Klik link konfirmasi lalu login.
3. Buat order dari website utama dan upload bukti pembayaran.
4. Approve order dari admin.
5. Pastikan email approval masuk melalui Brevo Transactional API.
6. Pastikan produk muncul di Library dan file hanya terbuka lewat signed URL.
7. Periksa Brevo Transactional Logs, Supabase Auth Logs, dan Vercel Logs bila gagal.

## Struktur utama

`app/(auth)` login/register/reset · `app/(member)/member` library/orders/events
· `app/(admin)/admin` dashboard · `app/api/public` API website utama ·
`lib/supabase` client Supabase · `lib/email` Brevo/Mailpit ·
`supabase/migrations` schema + RLS.

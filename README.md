# Member Area — Meta Romance (MVP v0.1)

Blueprint: `../STACK-MVP-FULL-PHASE-Meta-Romance.md`. PRD: `../PRD-Meta-Romance-Member-Area.md`.
Domain: `member.metaromance.com`. Bahasa Indonesia, mobile-first.

## Jalankan lokal

```bash
cd "Member Area/member"
pnpm install
cp .env.example .env.local   # isi Supabase + Resend
pnpm dev                     # http://localhost:3001
```

Tanpa Supabase: halaman menampilkan error state yang jelas
(`SUPABASE_NOT_CONFIGURED`). DB adalah source of truth (§8) — tidak ada
mode localStorage.

## Supabase setup (Phase 0, manual 1x)

1. Buat project di supabase.com → ambil URL + publishable key + service role.
2. SQL Editor: `supabase/migrations/0001_init.sql` lalu `supabase/seed.sql`.
3. Cek: `supabase/tests/smoke.sql` (12 produk, 4 event, 5 buckets, RLS on).
4. Auth → Email provider on. Buat admin: register biasa lalu update
   `profiles.role = 'ADMIN'` via service role / Table Editor.
5. Storage: buckets dibuat oleh seed; `payment-proofs` + `product-files`
   privat (signed URL saja).

## Struktur (§5)

`app/(auth)` login/register/forgot/reset · `app/(member)/member` (+products,
events, orders, account, notifications) · `app/(admin)/admin` (+products,
orders, events, users, settings) · `app/checkout/[productId]` ·
`app/payment/[orderId]` · `app/api/files` (signed URL) + `api/notifications` ·
`components/ui|member|admin|products|events|orders` · `lib/supabase|auth|
permissions|validations|email|utils` · `actions/` · `types/` · `emails/` ·
`supabase/migrations|seed.sql|tests`.

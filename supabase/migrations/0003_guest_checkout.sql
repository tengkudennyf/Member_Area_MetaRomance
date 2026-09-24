-- 0003 — Guest checkout dari website utama (tanpa login).
-- Order tamu: user_id NULL + data kontak di guest_*. Dibuat via service role
-- dari POST /api/public/order. RLS anon tetap tertutup; tamu cek status
-- via GET /api/public/order (dicocokkan order_number + email, server-side).

alter table public.orders
  alter column user_id drop not null;

alter table public.orders
  add column if not exists guest_name text null,
  add column if not exists guest_email text null,
  add column if not exists guest_phone text null,
  add column if not exists source text not null default 'MEMBER'
    check (source in ('MEMBER','WEBSITE'));

-- Order harus milik user terdaftar ATAU tamu ber-email.
alter table public.orders
  drop constraint if exists orders_owner_check;
alter table public.orders
  add constraint orders_owner_check
  check (user_id is not null or guest_email is not null);

create index if not exists idx_orders_guest on public.orders (guest_email);

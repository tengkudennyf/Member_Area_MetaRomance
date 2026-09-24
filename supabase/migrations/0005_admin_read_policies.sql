-- 0005 — kebijakan baca admin (C3 follow-up audit B7/§23).
--
-- Masalah: semua halaman /admin membaca via user client (RLS), tapi policy
-- yang ada hanya "own ..." — admin praktis TIDAK bisa melihat data user lain
-- (tabel Users/Orders kosong/sebagian). Operasi tulis admin tetap via
-- service role di Server Actions (tidak berubah).
--
-- Solusi: fungsi public.is_admin() (SECURITY DEFINER, anti-rekursi) +
-- policy SELECT "admin ..." di tabel operasional. pattern standar Supabase.

create or replace function public.is_admin() returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'ADMIN'
  );
$$;

comment on function public.is_admin() is
  'True bila user login adalah ADMIN. Dipakai policy baca admin; tulis admin tetap service role.';

-- profiles: admin boleh baca semua (hitung user, kelola, grant akses)
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
  for select using (public.is_admin());

-- orders + items + payments: admin baca semua (antrean verifikasi)
drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders
  for select using (public.is_admin());

drop policy if exists "items admin read" on public.order_items;
create policy "items admin read" on public.order_items
  for select using (public.is_admin());

drop policy if exists "payments admin read" on public.payments;
create policy "payments admin read" on public.payments
  for select using (public.is_admin());

-- product_access + event_registrations: admin baca semua (kepemilikan, peserta)
drop policy if exists "access admin read" on public.product_access;
create policy "access admin read" on public.product_access
  for select using (public.is_admin());

drop policy if exists "regs admin read" on public.event_registrations;
create policy "regs admin read" on public.event_registrations
  for select using (public.is_admin());

-- site_contents: admin baca semua status (kelola konten web, termasuk DRAFT)
drop policy if exists "contents admin read" on public.site_contents;
create policy "contents admin read" on public.site_contents
  for select using (public.is_admin());

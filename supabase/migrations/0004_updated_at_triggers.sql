-- 0004 — trigger updated_at otomatis (C2) + dokumentasi RLS guest orders (C1).
-- Jalankan di Supabase Dashboard → SQL Editor setelah 0001–0003.

-- C2: kolom updated_at selama ini harus dikirim manual di setiap UPDATE.
-- Trigger ini membuatnya otomatis di semua tabel inti.
create or replace function public.update_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'products', 'orders', 'payments',
    'events', 'event_registrations', 'app_settings'
  ] loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format(
      'create trigger trg_updated_at before update on public.%I '
      'for each row execute function public.update_timestamp()',
      t
    );
  end loop;
end;
$$;

-- C1: dokumentasi pola akses guest orders (user_id NULL, dari 0003).
-- Guest orders SENGAJA tidak bisa dibaca via RLS oleh siapapun (policy
-- "orders own" hanya cocok untuk user_id terdaftar). Akses tamu HANYA via
-- service role di GET/POST /api/public/order|proof yang memverifikasi
-- pasangan order_number + email secara server-side. Jangan "perbaiki" ini
-- dengan melonggarkan RLS — itu akan membocorkan order antar tamu.
comment on column public.orders.user_id is
  'NULL = order tamu dari website (guest_* terisi). Hanya service role yang boleh baca; RLS user tidak mencakup baris ini (by design, C1).';
comment on column public.orders.guest_email is
  'Email tamu; dipakai bersama order_number untuk otorisasi server-side di /api/public/order|proof.';
comment on column public.orders.source is
  'MEMBER = dari aplikasi login; WEBSITE = guest checkout tanpa login.';

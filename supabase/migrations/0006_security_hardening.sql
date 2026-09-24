-- 0006: security hardening (audit S1, S2).
-- S2: idempotency key per order aktif — cegah order ganda (double-click / retry
--     concurrent) di level database. Partial index: hanya status aktif yang konflik,
--     order REJECTED/CANCELLED boleh dibuat ulang, order basi yang di-cleanup
--     otomatis membebaskan key.
alter table public.orders
  add column if not exists dedupe_key text;

create unique index if not exists idx_orders_dedupe_active
  on public.orders (dedupe_key)
  where dedupe_key is not null
    and status in ('PENDING_PAYMENT', 'WAITING_VERIFICATION', 'PAID');

-- S1: klaim kursi event atomik (lock baris event + hitung + insert dalam 1
--     transaksi). Dipakai saat APPROVE (titik materialisasi overbook), bukan
--     saat checkout (agar kursi tidak bocor untuk order yang tak dibayar).
--     Return: 'OK' | 'DUP' (sudah terdaftar — idempoten) | 'FULL' | 'NOT_FOUND'.
--     SECURITY DEFINER + tanpa GRANT ke anon/authenticated: hanya service_role
--     (server) yang memanggil via RPC.
create or replace function public.register_event_slot(
  p_event_id uuid,
  p_user_id uuid,
  p_order_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  q int;
  c int;
  has boolean;
begin
  select quota into q from public.events where id = p_event_id for update;
  if not found then
    return 'NOT_FOUND';
  end if;

  select exists(
    select 1 from public.event_registrations
    where event_id = p_event_id and user_id = p_user_id and status = 'REGISTERED'
  ) into has;
  if has then
    return 'DUP';
  end if;

  if q is not null then
    select count(*) into c from public.event_registrations
      where event_id = p_event_id and status = 'REGISTERED';
    if c >= q then
      return 'FULL';
    end if;
  end if;

  insert into public.event_registrations (event_id, user_id, order_id, status)
    values (p_event_id, p_user_id, p_order_id, 'REGISTERED')
  on conflict (event_id, user_id)
  do update set status = 'REGISTERED', order_id = excluded.order_id, updated_at = now();

  return 'OK';
end;
$$;

-- S2 (tambahan): cegah double-grant product_access ACTIVE secara concurrent.
-- Klaim ulang setelah REVOKE/EXPIRE tetap bisa (baris lama bukan ACTIVE).
create unique index if not exists idx_access_user_product_active
  on public.product_access (user_id, product_id)
  where status = 'ACTIVE';

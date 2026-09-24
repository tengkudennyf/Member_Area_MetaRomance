-- 0007: izinkan perubahan role hanya dari trusted server/admin context.
--
-- Trigger awal 0001 menolak SEMUA perubahan role, termasuk SQL Editor dan
-- service role. Akibatnya admin pertama tidak dapat dibuat. Versi ini tetap
-- menolak request authenticated/anon, tetapi mengizinkan SQL admin dan secret
-- key/service role yang memang berada di server.

create or replace function public.lock_role_change() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and coalesce(auth.role(), '') <> 'service_role'
    and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'role hanya bisa diubah server-side (service role)';
  end if;
  return new;
end;
$$;

comment on function public.lock_role_change() is
  'Mencegah anon/authenticated mengubah role; SQL admin dan service role diizinkan.';

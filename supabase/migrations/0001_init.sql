-- PHASE 0 — migrasi awal (§10–19 + RLS §23 + indeks §6).
-- Jalankan di Supabase Dashboard → SQL Editor.

-- profiles (§10)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  avatar_url text null,
  role text not null default 'USER' check (role in ('USER','ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- products (§11)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  pillar text not null check (pillar in ('5D_CONSCIOUSNESS','ROMANCE_ATTRACTION','FINANCIAL_CAREER','MANIFESTATION_TOOLS')),
  product_type text not null default 'EBOOK'
    check (product_type in ('EBOOK','WORKBOOK','JOURNAL','GUIDE','DIGITAL_MATERIAL')),
  cover_path text null,
  file_path text null,
  price integer not null default 0 check (price >= 0),
  original_price integer null check (original_price is null or original_price >= 0),
  download_enabled boolean not null default true,
  access_type text not null default 'LIFETIME' check (access_type in ('LIFETIME','LIMITED')),
  status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- orders (§12)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subtotal integer not null default 0,
  discount integer not null default 0,
  total integer not null default 0,
  status text not null default 'PENDING_PAYMENT'
    check (status in ('PENDING_PAYMENT','WAITING_VERIFICATION','PAID','REJECTED','CANCELLED','REFUNDED')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- events (§16 — dibuat lebih awal karena order_items mereferensinya)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  pillar text not null check (pillar in ('5D_CONSCIOUSNESS','ROMANCE_ATTRACTION','FINANCIAL_CAREER','MANIFESTATION_TOOLS')),
  event_type text not null default 'WORKSHOP'
    check (event_type in ('WEBINAR','WORKSHOP','CLASS','SPECIAL_SESSION')),
  cover_path text null,
  platform text not null default 'ZOOM'
    check (platform in ('ZOOM','GOOGLE_MEET','YOUTUBE','OTHER')),
  meeting_url text null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  price integer not null default 0 check (price >= 0),
  quota integer null check (quota is null or quota >= 0),
  status text not null default 'DRAFT'
    check (status in ('DRAFT','PUBLISHED','UPCOMING','ONGOING','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- order_items (§13 — snapshot agar histori tidak berubah saat produk diedit)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid null references public.products(id),
  event_id uuid null references public.events(id),
  item_type text not null default 'PRODUCT' check (item_type in ('PRODUCT','EVENT')),
  title_snapshot text not null,
  price_snapshot integer not null default 0,
  created_at timestamptz not null default now()
);

-- payments (§14)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method text not null default 'BANK_TRANSFER' check (payment_method = 'BANK_TRANSFER'),
  proof_path text null,
  status text not null default 'PENDING'
    check (status in ('PENDING','SUBMITTED','APPROVED','REJECTED')),
  submitted_at timestamptz null,
  verified_at timestamptz null,
  verified_by uuid null references public.profiles(id),
  rejection_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- product_access (§15)
create table if not exists public.product_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  order_id uuid null references public.orders(id),
  source text not null default 'PURCHASE'
    check (source in ('PURCHASE','ADMIN','PROMO','BONUS')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED','EXPIRED')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz null,
  granted_by uuid null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- event_registrations (§17)
create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid null references public.orders(id),
  status text not null default 'REGISTERED'
    check (status in ('REGISTERED','CANCELLED','ATTENDED','NO_SHOW')),
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- notifications (§18)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  href text null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

-- app_settings (§19 key-value)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values
  ('bank_account', '[{"bank": "[Nama Bank]", "number": "[Nomor Rekening]", "name": "[Nama Pemilik]"}]'),
  ('support_contact', '"[nomor WA] / [email]"'),
  ('payment_instruction', '"Transfer sesuai total, lalu upload bukti di halaman payment."'),
  ('event_join_window', '"60"'),
  ('download_policy', '"Lifetime untuk produk ACTIVE."')
on conflict (key) do nothing;

-- Indeks (§6 Database)
create index if not exists idx_orders_user on public.orders (user_id, created_at desc);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_items_order on public.order_items (order_id);
create index if not exists idx_payments_order on public.payments (order_id);
create index if not exists idx_access_user on public.product_access (user_id, status);
create index if not exists idx_products_slug on public.products (slug);
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_events_slug on public.events (slug);
create index if not exists idx_events_status on public.events (status);
create index if not exists idx_regs_event on public.event_registrations (event_id);
create index if not exists idx_regs_user on public.event_registrations (user_id);
create index if not exists idx_notif_user on public.notifications (user_id, created_at desc);
create index if not exists idx_profiles_auth on public.profiles (auth_user_id);

-- RLS (§23)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.product_access enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;

-- profiles: own read/update kolom non-role (role dikunci via trigger di bawah)
drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read" on public.profiles
  for select using (auth_user_id = auth.uid());
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Kunci role: user tidak bisa mengangkat dirinya jadi ADMIN dari browser.
create or replace function public.lock_role_change() returns trigger as $$
begin
  if new.role <> old.role then
    raise exception 'role hanya bisa diubah server-side (service role)';
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists trg_lock_role on public.profiles;
create trigger trg_lock_role before update on public.profiles
  for each row execute function public.lock_role_change();

-- products/events published: publik baca (harga perlu tampil di checkout)
drop policy if exists "products published read" on public.products;
create policy "products published read" on public.products
  for select using (status = 'PUBLISHED');
drop policy if exists "events visible read" on public.events;
create policy "events visible read" on public.events
  for select using (status <> 'DRAFT');

-- own data: orders/items/payments/access/regs/notifications
drop policy if exists "orders own" on public.orders;
create policy "orders own" on public.orders for all
  using (user_id in (select id from public.profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from public.profiles where auth_user_id = auth.uid()));
drop policy if exists "items own" on public.order_items;
create policy "items own" on public.order_items for all
  using (exists (select 1 from public.orders o
    join public.profiles p on p.id = o.user_id
    where o.id = order_id and p.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.orders o
    join public.profiles p on p.id = o.user_id
    where o.id = order_id and p.auth_user_id = auth.uid()));
drop policy if exists "payments own" on public.payments;
create policy "payments own" on public.payments for all
  using (exists (select 1 from public.orders o
    join public.profiles p on p.id = o.user_id
    where o.id = order_id and p.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.orders o
    join public.profiles p on p.id = o.user_id
    where o.id = order_id and p.auth_user_id = auth.uid()));
drop policy if exists "access own read" on public.product_access;
create policy "access own read" on public.product_access
  for select using (user_id in (select id from public.profiles where auth_user_id = auth.uid()));
drop policy if exists "regs own" on public.event_registrations;
create policy "regs own" on public.event_registrations for all
  using (user_id in (select id from public.profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from public.profiles where auth_user_id = auth.uid()));
drop policy if exists "notif own" on public.notifications;
create policy "notif own" on public.notifications for all
  using (user_id in (select id from public.profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from public.profiles where auth_user_id = auth.uid()));

-- settings: semua baca (instruksi pembayaran publik), tulis server-side
drop policy if exists "settings read" on public.app_settings;
create policy "settings read" on public.app_settings for select using (true);

-- Auto-create profile setelah signup (§21 flow)
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (auth_user_id, name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email, coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

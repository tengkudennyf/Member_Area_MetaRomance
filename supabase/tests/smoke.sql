-- supabase/tests — cek cepat setelah migrasi + seed (jalankan per blok).
-- 1. Tabel ada
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles','products','orders','order_items','payments',
    'product_access','events','event_registrations','app_settings','notifications');
-- 2. Seed: 12 produk PUBLISHED + 4 event
select count(*) as published_products from public.products where status = 'PUBLISHED';
select count(*) as events from public.events;
-- 3. Buckets
select id, public from storage.buckets
where id in ('product-covers','event-covers','avatars','payment-proofs','product-files');
-- 4. RLS aktif
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','products','orders','order_items','payments',
    'product_access','events','event_registrations','notifications','app_settings');

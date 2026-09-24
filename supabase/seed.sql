-- Seed katalog MVP: 12 produk (dari website utama) + 4 event.
-- products memakai uuid agar FK order_items/product_access konsisten.
-- Jalankan setelah seluruh migration 0001–0007.

-- ===== PRODUCTS (12) =====
insert into public.products (id, title, slug, description, pillar, product_type, price, original_price, status) values
  ('11111111-1111-1111-1111-111111111101','Ebook 5D: Peta Pola Pikir & Emosi Sehari-hari','5d-peta-emosi','Kenali 10 pola pikir & emosi paling umum + latihan observasi 3 hari + panduan menamai emosi.','5D_CONSCIOUSNESS','EBOOK',149000,199000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111102','Ebook 5D: Reframing — Dari Reaktif ke Responsif','5d-reframing','20 contoh reframing + latihan 7 hari + review mingguan.','5D_CONSCIOUSNESS','EBOOK',189000,249000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111103','Ebook 5D: Jurnal Observasi Diri 30 Hari','5d-jurnal-30hari','Worksheet 30 hari + 30 studi kasus singkat + evaluasi akhir.','5D_CONSCIOUSNESS','EBOOK',249000,329000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111104','Ebook Romance: Audit Self-Worth & Standar Relasi','romance-selfworth','Kuis self-worth + daftar standar relasi + latihan batasan + jurnal 3 hari.','ROMANCE_ATTRACTION','EBOOK',149000,199000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111105','Ebook Romance: Komunikasi Batasan Tanpa Drama','romance-batasan','15 skrip komunikasi + peta pola relasi + simulasi chat.','ROMANCE_ATTRACTION','EBOOK',189000,249000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111106','Ebook Romance: Memahami Pola Relasi Anda','romance-pola','Bedah pola berulang + evaluasi mingguan + rencana 90 hari.','ROMANCE_ATTRACTION','EBOOK',249000,329000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111107','Ebook Financial: Audit Keyakinan Uang & Karier','financial-keyakinan','Audit 12 keyakinan penghambat + prioritas 3 hari + jurnal uang.','FINANCIAL_CAREER','EBOOK',149000,199000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111108','Ebook Financial: Habit Tracker & Review Mingguan','financial-habit','Template tracker + review mingguan + contoh 4 minggu.','FINANCIAL_CAREER','EBOOK',189000,249000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111109','Ebook Financial: Menyusun Arah Karier 90 Hari','financial-arah','Milestone mingguan + checklist keputusan + template evaluasi.','FINANCIAL_CAREER','EBOOK',249000,329000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111110','Ebook Manifest: Journaling 5 Menit Pagi & Malam','manifest-journaling','Template pagi-malam + 7 contoh terisi + panduan brain-dump.','MANIFESTATION_TOOLS','JOURNAL',149000,199000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111111','Ebook Manifest: Visualisasi & Afirmasi Praktis','manifest-visuafirmasi','Skrip visualisasi 3 menit + 30 afirmasi + pairing tindakan.','MANIFESTATION_TOOLS','GUIDE',189000,249000,'PUBLISHED'),
  ('11111111-1111-1111-1111-111111111112','Ebook Manifest: Planner Goal 90 Hari','manifest-planner','Planner 90 hari + milestone mingguan + habit tracker.','MANIFESTATION_TOOLS','WORKBOOK',249000,329000,'PUBLISHED')
on conflict (id) do update set title = excluded.title, price = excluded.price,
  original_price = excluded.original_price, status = excluded.status;

-- ===== EVENTS (4) =====
insert into public.events (id, title, slug, description, pillar, event_type, platform, start_at, end_at, price, quota, status) values
  ('22222222-2222-2222-2222-222222222201','Live Workshop 5D Consciousness: Praktik Sadar Emosi','workshop-5d-consciousness','Praktik langsung bersama fasilitator + sesi tanya-jawab.','5D_CONSCIOUSNESS','WORKSHOP','ZOOM', now() + interval '21 days', now() + interval '21 days' + interval '2 hours',499000,100,'UPCOMING'),
  ('22222222-2222-2222-2222-222222222202','Live Workshop Romance / Attraction: Praktik Relasi Sehat','workshop-romance-attraction','Studi kasus pola relasi + role-play komunikasi batasan.','ROMANCE_ATTRACTION','WORKSHOP','ZOOM', now() + interval '42 days', now() + interval '42 days' + interval '2 hours',499000,100,'PUBLISHED'),
  ('22222222-2222-2222-2222-222222222203','Live Workshop Financial / Career: Praktik Arah Karier 90 Hari','workshop-financial-career','Bedah kebiasaan finansial + peta arah karier 90 hari.','FINANCIAL_CAREER','WORKSHOP','ZOOM', now() + interval '63 days', now() + interval '63 days' + interval '2 hours',499000,100,'PUBLISHED'),
  ('22222222-2222-2222-2222-222222222204','Live Workshop Manifestation Tools: Praktik 4 Tools','workshop-manifestation-tools','Journaling + visualisasi + afirmasi + goal breakdown.','MANIFESTATION_TOOLS','WORKSHOP','ZOOM', now() + interval '84 days', now() + interval '84 days' + interval '2 hours',499000,100,'PUBLISHED')
on conflict (id) do update set title = excluded.title, price = excluded.price, status = excluded.status;

-- ===== STORAGE BUCKETS (§20) =====
-- product-covers + event-covers: public readable; avatars: user controlled;
-- payment-proofs + product-files: PRIVATE (signed URL saja).
insert into storage.buckets (id, name, public) values
  ('product-covers','product-covers', true),
  ('event-covers','event-covers', true),
  ('avatars','avatars', false),
  ('payment-proofs','payment-proofs', false),
  ('product-files','product-files', false)
on conflict (id) do nothing;

-- Covers publik read
drop policy if exists "covers public read" on storage.objects;
create policy "covers public read" on storage.objects for select
  using (bucket_id in ('product-covers','event-covers'));
-- Avatars: user kelola file sendiri
drop policy if exists "avatars own" on storage.objects;
create policy "avatars own" on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
-- Privat: tulis/izinkan via service role server-side; tanpa policy baca publik.

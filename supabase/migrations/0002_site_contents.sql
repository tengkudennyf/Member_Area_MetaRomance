-- 0002 — CMS konten Front End (§CMS).
-- Satu tabel key-value agar semua teks front bisa diedit dari dashboard admin.
-- Front End baca via GET /api/public/site (jangan akses service_role dari browser).

create table if not exists public.site_contents (
  key text primary key,
  label text not null default '',
  data jsonb not null default '{}'::jsonb,
  status text not null default 'PUBLISHED' check (status in ('DRAFT','PUBLISHED')),
  updated_at timestamptz not null default now()
);

alter table public.site_contents enable row level security;

-- Publik (front-end) boleh baca yang PUBLISHED saja.
drop policy if exists "site_contents public read" on public.site_contents;
create policy "site_contents public read" on public.site_contents
  for select using (status = 'PUBLISHED');

-- Tulis hanya via service role (actions admin). Tanpa policy insert/update/delete publik.

-- Seed default: mirror konten hardcoded front-end saat ini.
-- Admin tinggal edit dari /admin/contents, front otomatis ikut berubah.
insert into public.site_contents (key, label, data, status) values
  ('homepage_hero', 'Homepage — Hero',
   '{"title": "Tingkatkan Kesadaran Anda & Temukan Jalan Anda", "subtitle": "Platform pengembangan diri dengan pendekatan spiritual.", "desc": "4 pilar: kesadaran diri, hubungan, karier-keuangan, & tools manifestasi.", "cta_primary": "Jelajahi 4 Pilar", "cta_secondary": "Lihat Ebook & Event"}',
   'PUBLISHED'),
  ('homepage_featured', 'Homepage — Ebook & Event Unggulan',
   '{"ebook_slug": "5d-peta-emosi", "ebook_title": "Ebook Fondasi 4 Pilar: Panduan Memulai", "ebook_desc": "Gambaran utuh 4 pilar + latihan pertama tiap pilar.", "event_title": "Live Workshop: Praktik Kesadaran & Relasi Sehat", "event_desc": "Praktik langsung bersama fasilitator & komunitas. Online via Zoom."}',
   'PUBLISHED'),
  ('homepage_testimonials', 'Homepage — Testimoni',
   '{"items": [{"quote": "Saya jadi lebih sadar sama pola emosi saya sendiri.", "author": "Peserta 5D Consciousness"}, {"quote": "Ikut Event Romance bikin saya berani evaluasi pola relasi saya.", "author": "Peserta Romance / Attraction"}, {"quote": "Bagian Financial/Career ngebantu saya beresin kebiasaan kecil dulu.", "author": "Peserta Financial / Career"}, {"quote": "Journaling + visualization-nya kepakai banget.", "author": "Peserta Manifestation Tools"}]}',
   'PUBLISHED'),
  ('ebook_details', 'Detail Ebook — sinopsis/tujuan (override ebookDrafts.ts)',
   '{"note": "Opsional. Key = slug ebook, value = {synopsis, tujuan[], untukSiapa[], tidakUntukSiapa[]}. Kalau kosong, front pakai default hardcoded.", "overrides": {}}',
   'PUBLISHED'),
  ('pillar_5d-consciousness', 'Pilar — 5D Consciousness (override)',
   '{"heroDesc": "", "storyIntro": "", "approachNote": "", "event_title": "", "event_description": ""}',
   'PUBLISHED'),
  ('pillar_romance-and-attraction', 'Pilar — Romance & Attraction (override)',
   '{"heroDesc": "", "storyIntro": "", "approachNote": "", "event_title": "", "event_description": ""}',
   'PUBLISHED'),
  ('pillar_financial-and-career', 'Pilar — Financial & Career (override)',
   '{"heroDesc": "", "storyIntro": "", "approachNote": "", "event_title": "", "event_description": ""}',
   'PUBLISHED'),
  ('pillar_manifestation-tools', 'Pilar — Manifestation Tools (override)',
   '{"heroDesc": "", "storyIntro": "", "approachNote": "", "event_title": "", "event_description": ""}',
   'PUBLISHED')
on conflict (key) do nothing;

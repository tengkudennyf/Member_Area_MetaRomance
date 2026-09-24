// Demo store — DEV ONLY, aktif bila Supabase belum diset (lihat lib/supabase/env).
// BUKAN source of truth produksi: data JSON lokal, reset bila file dihapus.
// Produksi tetap Supabase (plan §8). File ini tidak pernah diimport client.
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export type Row = Record<string, unknown>;

export type DemoDB = {
  authUsers: { id: string; email: string; password: string; profileId: string }[];
  profiles: Row[];
  products: Row[];
  events: Row[];
  orders: Row[];
  order_items: Row[];
  payments: Row[];
  product_access: Row[];
  event_registrations: Row[];
  notifications: Row[];
  app_settings: { key: string; value: string }[];
  site_contents: { key: string; label: string; data: Record<string, unknown>; status: string; updated_at: string }[];
};

const DIR = path.join(process.cwd(), "..", "Data");
const FILE = path.join(DIR, "demo.json");
export const FILES_DIR = path.join(DIR, "demo-files");

const T = "2026-09-21T10:00:00.000Z";

function seed(): DemoDB {
  const P = (n: string) => `11111111-1111-4111-8111-1111111111${n}`;
  const products: Row[] = [
    [
      "5d-peta-emosi",
      "Ebook 5D: Peta Pola Pikir & Emosi Sehari-hari",
      "Kenali 10 pola pikir & emosi paling umum + latihan observasi 3 hari + panduan menamai emosi.",
      "5D_CONSCIOUSNESS",
      "EBOOK",
      149000,
      199000,
      "01",
    ],
    [
      "5d-reframing",
      "Ebook 5D: Reframing — Dari Reaktif ke Responsif",
      "20 contoh reframing + latihan 7 hari + review mingguan.",
      "5D_CONSCIOUSNESS",
      "EBOOK",
      189000,
      249000,
      "02",
    ],
    [
      "5d-jurnal-30hari",
      "Ebook 5D: Jurnal Observasi Diri 30 Hari",
      "Worksheet 30 hari + 30 studi kasus singkat + evaluasi akhir.",
      "5D_CONSCIOUSNESS",
      "EBOOK",
      249000,
      329000,
      "03",
    ],
    [
      "romance-selfworth",
      "Ebook Romance: Audit Self-Worth & Standar Relasi",
      "Kuis self-worth + daftar standar relasi + latihan batasan + jurnal 3 hari.",
      "ROMANCE_ATTRACTION",
      "EBOOK",
      149000,
      199000,
      "04",
    ],
    [
      "romance-batasan",
      "Ebook Romance: Komunikasi Batasan Tanpa Drama",
      "15 skrip komunikasi + peta pola relasi + simulasi chat.",
      "ROMANCE_ATTRACTION",
      "EBOOK",
      189000,
      249000,
      "05",
    ],
    [
      "romance-pola",
      "Ebook Romance: Memahami Pola Relasi Anda",
      "Bedah pola berulang + evaluasi mingguan + rencana 90 hari.",
      "ROMANCE_ATTRACTION",
      "EBOOK",
      249000,
      329000,
      "06",
    ],
    [
      "financial-keyakinan",
      "Ebook Financial: Audit Keyakinan Uang & Karier",
      "Audit 12 keyakinan penghambat + prioritas 3 hari + jurnal uang.",
      "FINANCIAL_CAREER",
      "EBOOK",
      149000,
      199000,
      "07",
    ],
    [
      "financial-habit",
      "Ebook Financial: Habit Tracker & Review Mingguan",
      "Template tracker + review mingguan + contoh 4 minggu.",
      "FINANCIAL_CAREER",
      "EBOOK",
      189000,
      249000,
      "08",
    ],
    [
      "financial-arah",
      "Ebook Financial: Menyusun Arah Karier 90 Hari",
      "Milestone mingguan + checklist keputusan + template evaluasi.",
      "FINANCIAL_CAREER",
      "EBOOK",
      249000,
      329000,
      "09",
    ],
    [
      "manifest-journaling",
      "Ebook Manifest: Journaling 5 Menit Pagi & Malam",
      "Template pagi-malam + 7 contoh terisi + panduan brain-dump.",
      "MANIFESTATION_TOOLS",
      "JOURNAL",
      149000,
      199000,
      "10",
    ],
    [
      "manifest-visuafirmasi",
      "Ebook Manifest: Visualisasi & Afirmasi Praktis",
      "Skrip visualisasi 3 menit + 30 afirmasi + pairing tindakan.",
      "MANIFESTATION_TOOLS",
      "GUIDE",
      189000,
      249000,
      "11",
    ],
    [
      "manifest-planner",
      "Ebook Manifest: Planner Goal 90 Hari",
      "Planner 90 hari + milestone mingguan + habit tracker.",
      "MANIFESTATION_TOOLS",
      "WORKBOOK",
      249000,
      329000,
      "12",
    ],
  ].map(([slug, title, description, pillar, product_type, price, original_price, n]) => ({
    id: P(n as string),
    title,
    slug,
    description,
    pillar,
    product_type,
    cover_path: null,
    file_path: null,
    price,
    original_price,
    download_enabled: true,
    access_type: "LIFETIME",
    status: "PUBLISHED",
    created_at: T,
    updated_at: T,
  }));

  const E = (n: string) => `22222222-2222-4222-8222-2222222222${n}`;
  const events: Row[] = [
    [
      "workshop-5d-consciousness",
      "Live Workshop 5D Consciousness: Praktik Sadar Emosi",
      "5D_CONSCIOUSNESS",
      21,
      "UPCOMING",
      "01",
    ],
    [
      "workshop-romance-attraction",
      "Live Workshop Romance / Attraction: Praktik Relasi Sehat",
      "ROMANCE_ATTRACTION",
      42,
      "PUBLISHED",
      "02",
    ],
    [
      "workshop-financial-career",
      "Live Workshop Financial / Career: Praktik Arah Karier 90 Hari",
      "FINANCIAL_CAREER",
      63,
      "PUBLISHED",
      "03",
    ],
    [
      "workshop-manifestation-tools",
      "Live Workshop Manifestation Tools: Praktik 4 Tools",
      "MANIFESTATION_TOOLS",
      84,
      "PUBLISHED",
      "04",
    ],
  ].map(([slug, title, pillar, days, status, n]) => {
    const start = new Date(Date.now() + (days as number) * 86400000);
    start.setHours(19, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 3600000);
    return {
      id: E(n as string),
      title,
      slug,
      description: "Praktik langsung bersama fasilitator + sesi tanya-jawab.",
      pillar,
      event_type: "WORKSHOP",
      cover_path: null,
      platform: "ZOOM",
      meeting_url: "https://zoom.us/j/0000000000",
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      price: 499000,
      quota: 100,
      status,
      created_at: T,
      updated_at: T,
    };
  });

  const adminProfile = "00000000-0000-4000-8000-000000000001";
  const demoProfile = "00000000-0000-4000-8000-000000000002";
  const superProfile = "00000000-0000-4000-8000-000000000003";
  const member1Profile = "00000000-0000-4000-8000-000000000004";
  const member2Profile = "00000000-0000-4000-8000-000000000005";

  return {
    authUsers: [
      {
        id: "00000000-0000-4000-8000-0000000000a1",
        email: "admin@metaromance.com",
        password: "admin123",
        profileId: adminProfile,
      },
      {
        id: "00000000-0000-4000-8000-0000000000a2",
        email: "demo@metaromance.com",
        password: "demo1234",
        profileId: demoProfile,
      },
      {
        id: "00000000-0000-4000-8000-0000000000a3",
        email: "superadmin@metaromance.com",
        password: "super123",
        profileId: superProfile,
      },
      {
        id: "00000000-0000-4000-8000-0000000000a4",
        email: "member1@metaromance.com",
        password: "member123",
        profileId: member1Profile,
      },
      {
        id: "00000000-0000-4000-8000-0000000000a5",
        email: "member2@metaromance.com",
        password: "member123",
        profileId: member2Profile,
      },
    ],
    profiles: [
      {
        id: adminProfile,
        auth_user_id: "00000000-0000-4000-8000-0000000000a1",
        name: "Admin Meta Romance",
        email: "admin@metaromance.com",
        phone: "6280000000000",
        avatar_url: null,
        role: "ADMIN",
        status: "ACTIVE",
        created_at: T,
        updated_at: T,
      },
      {
        id: demoProfile,
        auth_user_id: "00000000-0000-4000-8000-0000000000a2",
        name: "Demo User",
        email: "demo@metaromance.com",
        phone: "6281200000000",
        avatar_url: null,
        role: "USER",
        status: "ACTIVE",
        created_at: T,
        updated_at: T,
      },
      {
        id: superProfile,
        auth_user_id: "00000000-0000-4000-8000-0000000000a3",
        name: "Super Admin",
        email: "superadmin@metaromance.com",
        phone: "6280000000001",
        avatar_url: null,
        role: "ADMIN",
        status: "ACTIVE",
        created_at: T,
        updated_at: T,
      },
      {
        id: member1Profile,
        auth_user_id: "00000000-0000-4000-8000-0000000000a4",
        name: "Member Satu",
        email: "member1@metaromance.com",
        phone: "6281200000001",
        avatar_url: null,
        role: "USER",
        status: "ACTIVE",
        created_at: T,
        updated_at: T,
      },
      {
        id: member2Profile,
        auth_user_id: "00000000-0000-4000-8000-0000000000a5",
        name: "Member Dua",
        email: "member2@metaromance.com",
        phone: "6281200000002",
        avatar_url: null,
        role: "USER",
        status: "ACTIVE",
        created_at: T,
        updated_at: T,
      },
    ],
    products,
    events,
    orders: [
      {
        id: "33333333-3333-4333-8333-333333333301",
        order_number: "MR-DEMO-0001",
        user_id: demoProfile,
        subtotal: 149000,
        discount: 0,
        total: 149000,
        status: "WAITING_VERIFICATION",
        notes: null,
        created_at: T,
        updated_at: T,
      },
      {
        id: "33333333-3333-4333-8333-333333333302",
        order_number: "MR-DEMO-0002",
        user_id: demoProfile,
        subtotal: 149000,
        discount: 0,
        total: 149000,
        status: "PAID",
        notes: null,
        created_at: T,
        updated_at: T,
      },
    ],
    order_items: [
      {
        id: randomUUID(),
        order_id: "33333333-3333-4333-8333-333333333301",
        product_id: P("01"),
        event_id: null,
        item_type: "PRODUCT",
        title_snapshot: "Ebook 5D: Peta Pola Pikir & Emosi Sehari-hari",
        price_snapshot: 149000,
        created_at: T,
      },
      {
        id: randomUUID(),
        order_id: "33333333-3333-4333-8333-333333333302",
        product_id: P("10"),
        event_id: null,
        item_type: "PRODUCT",
        title_snapshot: "Ebook Manifest: Journaling 5 Menit Pagi & Malam",
        price_snapshot: 149000,
        created_at: T,
      },
    ],
    payments: [
      {
        id: randomUUID(),
        order_id: "33333333-3333-4333-8333-333333333301",
        payment_method: "BANK_TRANSFER",
        proof_path: null,
        status: "SUBMITTED",
        submitted_at: T,
        verified_at: null,
        verified_by: null,
        rejection_reason: null,
        created_at: T,
        updated_at: T,
      },
      {
        id: randomUUID(),
        order_id: "33333333-3333-4333-8333-333333333302",
        payment_method: "BANK_TRANSFER",
        proof_path: null,
        status: "APPROVED",
        submitted_at: T,
        verified_at: T,
        verified_by: adminProfile,
        rejection_reason: null,
        created_at: T,
        updated_at: T,
      },
    ],
    product_access: [
      {
        id: randomUUID(),
        user_id: demoProfile,
        product_id: P("10"),
        order_id: "33333333-3333-4333-8333-333333333302",
        source: "PURCHASE",
        status: "ACTIVE",
        granted_at: T,
        expires_at: null,
        granted_by: adminProfile,
        created_at: T,
      },
    ],
    event_registrations: [],
    notifications: [
      {
        id: randomUUID(),
        user_id: demoProfile,
        type: "access_granted",
        title: "Pembayaran disetujui",
        message: '"Ebook Manifest: Journaling 5 Menit Pagi & Malam" kini ada di Library Anda.',
        href: "/member/products/manifest-journaling",
        read_at: null,
        created_at: T,
      },
    ],
    app_settings: [
      { key: "bank_account", value: JSON.stringify([{ bank: "Demo Bank", number: "0001234567", name: "Meta Romance" }]) },
      { key: "support_contact", value: JSON.stringify("[nomor WA demo] / demo@metaromance.com") },
      {
        key: "payment_instruction",
        value: JSON.stringify("DEMO: transfer fiktif, lalu upload file apa saja sebagai bukti."),
      },
      { key: "event_join_window", value: JSON.stringify("60") },
      { key: "download_policy", value: JSON.stringify("Lifetime untuk produk ACTIVE.") },
    ],
    site_contents: [
      {
        key: "homepage_hero",
        label: "Homepage — Hero",
        data: {
          title: "Tingkatkan Kesadaran Anda & Temukan Jalan Anda",
          subtitle: "Platform pengembangan diri dengan pendekatan spiritual.",
          desc: "4 pilar: kesadaran diri, hubungan, karier-keuangan, & tools manifestasi.",
        },
        status: "PUBLISHED",
        updated_at: T,
      },
      {
        key: "homepage_testimonials",
        label: "Homepage — Testimoni",
        data: {
          items: [
            { quote: "Saya jadi lebih sadar sama pola emosi saya sendiri.", author: "Peserta 5D Consciousness" },
            { quote: "Ikut Event Romance bikin saya berani evaluasi pola relasi saya.", author: "Peserta Romance / Attraction" },
          ],
        },
        status: "PUBLISHED",
        updated_at: T,
      },
      {
        key: "ebook_details",
        label: "Detail Ebook — sinopsis/tujuan",
        data: { note: "Override per slug ebook.", overrides: {} },
        status: "PUBLISHED",
        updated_at: T,
      },
    ],
  };
}

declare global {
  var __mrDemoDb: DemoDB | undefined;
}

export function loadDb(): DemoDB {
  if (globalThis.__mrDemoDb) return globalThis.__mrDemoDb;
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as DemoDB;
      // Backward-compat: demo.json lama belum punya site_contents
      if (!Array.isArray(parsed.site_contents)) {
        const fresh = seed();
        parsed.site_contents = fresh.site_contents;
      }
      globalThis.__mrDemoDb = parsed;
      return globalThis.__mrDemoDb;
    }
  } catch {
    /* corrupt → reseed */
  }
  globalThis.__mrDemoDb = seed();
  saveDb(globalThis.__mrDemoDb);
  return globalThis.__mrDemoDb;
}

export function saveDb(db: DemoDB): void {
  globalThis.__mrDemoDb = db;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  } catch {
    /* read-only env — tetap jalan in-memory */
  }
}

export function resetDb(): DemoDB {
  const db = seed();
  saveDb(db);
  return db;
}

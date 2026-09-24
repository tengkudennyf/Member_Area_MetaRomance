// CMS konten Front End — defaults (mirror hardcoded front saat ini).
// DB (site_contents) menimpa defaults ini. Front baca via /api/public/site.

export const SITE_CONTENT_KEYS = [
  "homepage_hero",
  "homepage_featured",
  "homepage_testimonials",
  "ebook_details",
  "pillar_5d-consciousness",
  "pillar_romance-and-attraction",
  "pillar_financial-and-career",
  "pillar_manifestation-tools",
] as const;

export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

export const SITE_CONTENT_LABELS: Record<string, string> = {
  homepage_hero: "Homepage — Hero",
  homepage_featured: "Homepage — Ebook & Event Unggulan",
  homepage_testimonials: "Homepage — Testimoni",
  ebook_details: "Detail Ebook — sinopsis/tujuan",
  "pillar_5d-consciousness": "Pilar — 5D Consciousness (override)",
  "pillar_romance-and-attraction": "Pilar — Romance & Attraction (override)",
  "pillar_financial-and-career": "Pilar — Financial & Career (override)",
  "pillar_manifestation-tools": "Pilar — Manifestation Tools (override)",
};

export const SITE_CONTENT_DEFAULTS: Record<string, Record<string, unknown>> = {
  homepage_hero: {
    title: "Tingkatkan Kesadaran Anda & Temukan Jalan Anda",
    subtitle: "Platform pengembangan diri dengan pendekatan spiritual.",
    desc: "4 pilar: kesadaran diri, hubungan, karier-keuangan, & tools manifestasi.",
    cta_primary: "Jelajahi 4 Pilar",
    cta_secondary: "Lihat Ebook & Event",
  },
  homepage_featured: {
    ebook_slug: "5d-peta-emosi",
    ebook_title: "Ebook Fondasi 4 Pilar: Panduan Memulai",
    ebook_desc: "Gambaran utuh 4 pilar + latihan pertama tiap pilar.",
    event_title: "Live Workshop: Praktik Kesadaran & Relasi Sehat",
    event_desc: "Praktik langsung bersama fasilitator & komunitas. Online via Zoom.",
  },
  homepage_testimonials: {
    items: [
      { quote: "Saya jadi lebih sadar sama pola emosi saya sendiri.", author: "Peserta 5D Consciousness" },
      { quote: "Ikut Event Romance bikin saya berani evaluasi pola relasi saya.", author: "Peserta Romance / Attraction" },
      { quote: "Bagian Financial/Career ngebantu saya beresin kebiasaan kecil dulu.", author: "Peserta Financial / Career" },
      { quote: "Journaling + visualization-nya kepakai banget.", author: "Peserta Manifestation Tools" },
    ],
  },
  ebook_details: { note: "Key = slug ebook. Kosong = pakai default front.", overrides: {} },
  "pillar_5d-consciousness": { heroDesc: "", storyIntro: "", approachNote: "", event_title: "", event_description: "" },
  "pillar_romance-and-attraction": { heroDesc: "", storyIntro: "", approachNote: "", event_title: "", event_description: "" },
  "pillar_financial-and-career": { heroDesc: "", storyIntro: "", approachNote: "", event_title: "", event_description: "" },
  "pillar_manifestation-tools": { heroDesc: "", storyIntro: "", approachNote: "", event_title: "", event_description: "" },
};

// Gabungkan DB + defaults: DB menang, field kosong ("") fallback ke default front.
export function mergeContents(
  rows: { key: string; data: Record<string, unknown> }[]
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = { ...SITE_CONTENT_DEFAULTS };
  for (const r of rows) {
    const base = (out[r.key] ?? {}) as Record<string, unknown>;
    const override = (r.data ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(override)) {
      if (v === "" || v === null || v === undefined) continue;
      merged[k] = v;
    }
    // overrides ebook_details digabung dalam, bukan ditimpa utuh
    if (r.key === "ebook_details" && typeof override.overrides === "object") {
      merged.overrides = {
        ...((base.overrides as Record<string, unknown>) ?? {}),
        ...((override.overrides as Record<string, unknown>) ?? {}),
      };
    }
    out[r.key] = merged;
  }
  return out;
}

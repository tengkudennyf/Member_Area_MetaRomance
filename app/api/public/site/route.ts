import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isDemoMode } from "@/lib/supabase/env";
import { loadDb } from "@/lib/demo/store";
import { SITE_CONTENT_DEFAULTS, mergeContents } from "@/lib/cms/defaults";
import { cors, preflight, denyDisallowedOrigin } from "@/lib/api/cors";
import { rateLimit, withRateHeaders } from "@/lib/api/rate-limit";

// Public API untuk Front End (website utama).
// GET /api/public/site → { products, events, contents }
// - products: status PUBLISHED saja (harga tampil di katalog)
// - events: semua kecuali DRAFT (jadwal tampil di katalog)
// - contents: site_contents PUBLISHED + defaults (teks hero, testimoni, override pilar)
// CORS whitelist (lib/api/cors) agar hanya domain front resmi yang bisa baca via browser.
// Cache 60 detik di CDN + 300 detik stale.

function cached(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res;
}

export async function OPTIONS(req: Request): Promise<NextResponse> {
  return cached(preflight(req));
}

export async function GET(req: Request): Promise<NextResponse> {
  const denied = denyDisallowedOrigin(req);
  if (denied) return denied;
  const limited = await rateLimit(req, "siteCatalog");
  if (limited) return cors(limited, req);

  try {
    if (isDemoMode()) {
      const db = loadDb();
      const products = (db.products as Record<string, unknown>[]).filter(
        (p) => p.status === "PUBLISHED"
      );
      const events = (db.events as Record<string, unknown>[]).filter(
        (e) => e.status !== "DRAFT"
      );
      const rows = ((db.site_contents ?? []) as { key: string; data: Record<string, unknown>; status: string }[])
        .filter((r) => r.status === "PUBLISHED")
        .map((r) => ({ key: r.key, data: r.data }));
      const contents = mergeContents(rows);
      const settings: Record<string, string> = {};
      for (const s of (db.app_settings ?? []) as { key: string; value: string }[]) {
        try {
          const parsed: unknown = JSON.parse(s.value);
          settings[s.key] = typeof parsed === "string" ? parsed : s.value;
        } catch {
          settings[s.key] = s.value;
        }
      }
      return withRateHeaders(cached(cors(NextResponse.json({ products, events, contents, settings }), req)), req, "siteCatalog");
    }

    const svc = createServiceClient();
    const [{ data: products }, { data: events }, { data: contentRows }, { data: settingsRows }] = await Promise.all([
      svc
        .from("products")
        .select("id, title, slug, description, pillar, product_type, price, original_price, cover_path, status")
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: true }),
      svc
        .from("events")
        .select("id, title, slug, description, pillar, event_type, platform, start_at, end_at, price, quota, status")
        .neq("status", "DRAFT")
        .order("start_at", { ascending: true }),
      svc.from("site_contents").select("key, data").eq("status", "PUBLISHED"),
      svc.from("app_settings").select("key, value").in("key", ["bank_account", "payment_instruction", "support_contact"]),
    ]);
    const contents = mergeContents(
      ((contentRows ?? []) as { key: string; data: Record<string, unknown> }[]).map((r) => ({
        key: r.key,
        data: (r.data ?? {}) as Record<string, unknown>,
      }))
    );
    // app_settings value = jsonb (seed menyimpan string JSON) → unwrap ke string.
    // bank_account bisa array multi-rekening: `bank_account` tetap string
    // gabungan (kompatibel Front End lama), plus `bank_accounts` array.
    const settings: Record<string, unknown> = {};
    for (const s of ((settingsRows ?? []) as { key: string; value: unknown }[])) {
      const v = s.value;
      const raw =
        typeof v === "string"
          ? v
          : typeof v === "object" && v !== null
            ? JSON.stringify(v)
            : String(v ?? "");
      try {
        const parsed: unknown = JSON.parse(raw);
        settings[s.key] = typeof parsed === "string" ? parsed : raw;
      } catch {
        settings[s.key] = raw;
      }
    }
    try {
      const rawBanks = settings.bank_account;
      const parsedBanks =
        typeof rawBanks === "string" ? (JSON.parse(rawBanks) as unknown) : rawBanks;
      if (Array.isArray(parsedBanks)) {
        const rows = parsedBanks
          .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
          .map((r) => ({
            bank: String(r.bank ?? ""),
            number: String(r.number ?? ""),
            name: String(r.name ?? ""),
          }))
          .filter((r) => r.bank || r.number);
        settings.bank_accounts = rows;
        settings.bank_account = rows
          .map((r) => `${r.bank} - ${r.number}${r.name ? ` a.n. ${r.name}` : ""}`)
          .join("; ");
      }
    } catch {
      /* abaikan — fallback string lama tetap dipakai */
    }
    void SITE_CONTENT_DEFAULTS;
    return withRateHeaders(
      cached(cors(
        NextResponse.json({ products: products ?? [], events: events ?? [], contents, settings }),
        req
      )),
      req,
      "siteCatalog"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat katalog";
    return cors(NextResponse.json({ error: msg }, { status: 500 }), req);
  }
}


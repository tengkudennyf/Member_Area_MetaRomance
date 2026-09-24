import { NextResponse } from "next/server";

// B2/S3: rate limiter dua lapis (tanpa dependensi baru).
// - Jika UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN diset → fixed window
//   GLOBAL via Upstash REST (efektif di Vercel serverless multi-instance).
// - Jika tidak → sliding window in-memory per instance (lolos development +
//   menahan abuse dasar). Fail-open ke in-memory bila Redis timeout/error agar
//   traffic legit tidak mati saat Redis gangguan.
//
// Setup Upstash (gratis 10K req/hari): dashboard Upstash → Redis → copy REST URL
// + REST TOKEN → isi di .env.local / Vercel env → restart/redeploy.

type Bucket = { hits: number[] };

const store = new Map<string, Bucket>();
const MAX_KEYS = 5000;

function prune(key: string, now: number, windowMs: number): Bucket {
  let b = store.get(key);
  if (!b) {
    b = { hits: [] };
    if (store.size >= MAX_KEYS) {
      const oldest = store.keys().next().value;
      if (oldest) store.delete(oldest);
    }
    store.set(key, b);
  }
  b.hits = b.hits.filter((t) => now - t < windowMs);
  return b;
}

let warnedNoUpstash = false;

function redisCfg(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  // Production tanpa Upstash = rate limit cuma in-memory per instance (lemah di
  // multi-instance Vercel). Teriak sekali di log (lihat PRODUCTION-GO-LIVE Fase 3).
  if (process.env.NODE_ENV === "production" && !warnedNoUpstash) {
    warnedNoUpstash = true;
    console.warn("[ratelimit] UPSTASH_* kosong di production — fallback in-memory per instance.");
  }
  return null;
}

/** Fixed window global: INCR + EXPIRE (hanya saat counter baru). Return count. */
async function redisTake(key: string, windowSec: number): Promise<number | null> {
  const cfg = redisCfg();
  if (!cfg) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    try {
      const r = await fetch(`${cfg.url}/incr/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => null)) as { result?: unknown } | null;
      const count = typeof j?.result === "number" ? j.result : parseInt(String(j?.result ?? "NaN"), 10);
      if (!Number.isFinite(count)) return null;
      if (count === 1) {
        await fetch(`${cfg.url}/expire/${encodeURIComponent(key)}/${windowSec}`, {
          headers: { Authorization: `Bearer ${cfg.token}` },
          signal: ctrl.signal,
        }).catch(() => null);
      }
      return count;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null; // fail-open → fallback in-memory di bawah
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimit = { limit: number; windowMs: number };

export const LIMITS = {
  orderCreate: { limit: 10, windowMs: 10 * 60 * 1000 }, // 10 order / 10 mnt / IP
  proofUpload: { limit: 20, windowMs: 10 * 60 * 1000 }, // 20 upload / 10 mnt / IP
  orderStatus: { limit: 60, windowMs: 60 * 1000 }, // 60 cek status / mnt / IP
  siteCatalog: { limit: 120, windowMs: 60 * 1000 }, // katalog publik, longgar
  challenge: { limit: 20, windowMs: 60 * 1000 }, // S10: 20 captcha / mnt / IP
} as const satisfies Record<string, RateLimit>;

function limited(scope: keyof typeof LIMITS, retryAfter: number): NextResponse {
  const cfg = LIMITS[scope];
  const res = NextResponse.json(
    { error: "Terlalu banyak permintaan. Coba lagi nanti." },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(retryAfter));
  res.headers.set("X-RateLimit-Limit", String(cfg.limit));
  res.headers.set("X-RateLimit-Remaining", "0");
  return res;
}

/** Return null bila lolos; 429 JSON bila kena limit (dengan header Retry-After). */
export async function rateLimit(
  req: Request,
  scope: keyof typeof LIMITS,
  extraKey = ""
): Promise<NextResponse | null> {
  const cfg = LIMITS[scope];
  const now = Date.now();
  const key = `ratelimit:${scope}:${clientIp(req)}${extraKey ? `:${extraKey}` : ""}`;

  // Lapis 1: Redis global (bila dikonfigurasi).
  const count = await redisTake(key, Math.ceil(cfg.windowMs / 1000));
  if (count !== null) {
    if (count > cfg.limit) return limited(scope, Math.ceil(cfg.windowMs / 1000));
    return null;
  }

  // Lapis 2: in-memory per instance (fallback).
  const b = prune(key, now, cfg.windowMs);
  if (b.hits.length >= cfg.limit) {
    const oldest = b.hits[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((cfg.windowMs - (now - oldest)) / 1000));
    return limited(scope, retryAfter);
  }
  b.hits.push(now);
  return null;
}

/** Limiter generik per kunci arbitrer (dipakai loginAction — tanpa Request/IP).
 *  Return true bila lolos, false bila kena limit. */
export async function takeAttempt(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const rkey = `ratelimit:attempt:${key}`;
  const count = await redisTake(rkey, Math.ceil(windowMs / 1000));
  if (count !== null) return count <= max;
  const b = prune(rkey, now, windowMs);
  if (b.hits.length >= max) return false;
  b.hits.push(now);
  return true;
}

/** Tempel header sisa kuota ke respons sukses (best-effort, in-memory). */
export function withRateHeaders(res: NextResponse, req: Request, scope: keyof typeof LIMITS): NextResponse {
  const cfg = LIMITS[scope];
  const b = store.get(`ratelimit:${scope}:${clientIp(req)}`);
  const remaining = Math.max(0, cfg.limit - (b?.hits.length ?? 0));
  res.headers.set("X-RateLimit-Limit", String(cfg.limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  return res;
}

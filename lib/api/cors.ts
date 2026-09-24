import { NextResponse } from "next/server";

// B1: origin "* "terbuka = situs palsu bisa memanggil API order/proof.
// Whitelist: domain web utama + app sendiri + localhost dev.
function allowedOrigins(): string[] {
  const list = [
    process.env.NEXT_PUBLIC_MAIN_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    "https://metaromance.web.id",
    "https://www.metaromance.web.id",
    "https://member.metaromance.web.id",
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return [...new Set(list.map((v) => v.trim().replace(/\/$/, "")))];
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // non-browser (curl/server-to-server) — rate limit + validasi tetap jalan
  const o = origin.trim().replace(/\/$/, "");
  if (allowedOrigins().includes(o)) return true;
  // Izinkan preview deployment Vercel milik project sendiri
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(o)) return true;
  return false;
}

function applyCors(req: Request | null, res: NextResponse): NextResponse {
  const origin = req?.headers.get("origin") ?? null;
  if (origin && isOriginAllowed(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  // Tanpa origin yang diizinkan: header ACAO tidak diset → browser block.
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export function cors(res: NextResponse, req?: Request): NextResponse {
  return applyCors(req ?? null, res);
}

export function preflight(req?: Request): NextResponse {
  return applyCors(req ?? null, new NextResponse(null, { status: 204 }));
}

/** 403 JSON bila origin browser tidak diizinkan. Return null bila lolos. */
export function denyDisallowedOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json({ error: "Origin tidak diizinkan." }, { status: 403 });
  }
  return null;
}

export function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

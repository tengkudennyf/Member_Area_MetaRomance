import { NextResponse } from "next/server";
import {
  generateVerificationCode,
  VERIFICATION_CODE_COOKIE,
  VERIFICATION_CODE_TTL_SECONDS,
} from "@/lib/auth/verification-code";
import { rateLimit } from "@/lib/api/rate-limit";

// Challenge kode verifikasi 5 huruf sementara pengganti Turnstile.
// S8: kode TIDAK PERNAH dikembalikan sebagai teks/JSON — hanya sebagai GAMBAR
// SVG (bot butuh OCR, bukan sekadar baca response). Nilai ekspektasi hanya ada
// di cookie httpOnly. S10: rate limit 20/mnt/IP.
// TODO(prod): hapus route ini saat balik ke Turnstile.
const INK = ["#f5d76e", "#7ef0c1", "#8ecdf5", "#f5a3c1", "#d3b8f5"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function renderSvg(code: string): string {
  const W = 200;
  const H = 64;
  const chars = code
    .split("")
    .map((ch, i) => {
      const x = 28 + i * 34 + Math.random() * 8;
      const y = 38 + Math.random() * 10;
      const rot = Math.floor(Math.random() * 30) - 15;
      const size = 30 + Math.floor(Math.random() * 8);
      return `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family="monospace" font-size="${size}" font-weight="bold" fill="${pick(INK)}" transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})">${ch}</text>`;
    })
    .join("");
  const lines = Array.from({ length: 4 }, () => {
    const y1 = 8 + Math.random() * (H - 16);
    const y2 = 8 + Math.random() * (H - 16);
    return `<line x1="0" y1="${y1.toFixed(0)}" x2="${W}" y2="${y2.toFixed(0)}" stroke="${pick(INK)}" stroke-opacity="0.35" stroke-width="1.5"/>`;
  }).join("");
  const dots = Array.from({ length: 24 }, () => {
    const cx = (Math.random() * W).toFixed(0);
    const cy = (Math.random() * H).toFixed(0);
    return `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${pick(INK)}" fill-opacity="0.5"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" rx="8" fill="#14141f"/>${dots}${chars}${lines}</svg>`;
}

export async function GET(req: Request) {
  const limited = await rateLimit(req, "challenge");
  if (limited) return limited;
  const code = generateVerificationCode();
  const res = new NextResponse(renderSvg(code), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
  res.cookies.set(VERIFICATION_CODE_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VERIFICATION_CODE_TTL_SECONDS,
  });
  return res;
}

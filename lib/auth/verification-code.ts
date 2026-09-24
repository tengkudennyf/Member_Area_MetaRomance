// Login Verification Code sementara pengganti Cloudflare Turnstile.
// Format: 5 karakter huruf+angka tanpa karakter ambigu (O/0, I/1, L).
// Validasi server-side via cookie httpOnly `lv_code` (lihat
// app/api/auth/challenge/route.ts + actions/auth.ts).
// TODO(prod): hapus file ini saat balik ke Turnstile. File Turnstile
// (components/auth/turnstile.tsx) sengaja TIDAK dihapus agar restore mudah.

export const VERIFICATION_CODE_COOKIE = "lv_code";
export const VERIFICATION_CODE_TTL_SECONDS = 5 * 60;
export const VERIFICATION_CODE_LENGTH = 5;

// Alfabet tanpa O/0, I/1, L agar mudah dibaca user.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateVerificationCode(length = VERIFICATION_CODE_LENGTH): string {
  let out = "";
  // crypto.getRandomValues tersedia di Node 20+ maupun Edge runtime.
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[(buf[i] ?? 0) % ALPHABET.length];
  }
  return out;
}

export function normalizeCode(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

export function isCodeFormatValid(v: string): boolean {
  return /^[A-HJ-NP-Z2-9]{5}$/i.test(v.trim());
}

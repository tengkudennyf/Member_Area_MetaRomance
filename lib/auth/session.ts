import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/permissions/guard";

// Helper sesi server-side (§21–22). Dipakai Server Components + Actions.
// B7: implementasi tunggal ada di lib/permissions/guard#getSessionProfile —
// fungsi ini hanya membuat client lalu mendelegasikan ke sana.
export async function getSession() {
  const supabase = await createClient();
  const { user, profile } = await getSessionProfile(supabase);
  return { supabase, user, profile };
}

export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  // S13: di production, link email (verifikasi/reset/claim) mati total bila
  // env lupa diset — gagal keras saat boot/request, bukan silent broken link.
  if (!url && process.env.NODE_ENV === "production")
    throw new Error("NEXT_PUBLIC_APP_URL wajib diset di production");
  return url ?? "http://localhost:3001";
}

// S5: redirect aman — tolak protocol-relative "//evil.com" (lolos startsWith("/"))
// dan path backslash. Pakai di semua Server Action + page yang baca ?next=.
export function safeNext(v: string | null | undefined, fallback = "/member"): string {
  if (!v) return fallback;
  if (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\")) return v;
  return fallback;
}

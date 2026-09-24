// Validasi env Supabase. Bila belum diset → throw SUPABASE_NOT_CONFIGURED
// yang ditangkap app/error.tsx jadi pesan setup yang jelas (bukan crash mentah).
const PLACEHOLDERS = ["xyzcompany", "isi-", "changeme", "example"];

function isPlaceholder(v: string | undefined): boolean {
  if (!v || v.trim().length === 0) return true;
  const low = v.toLowerCase();
  return PLACEHOLDERS.some((p) => low.includes(p));
}

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function assertSupabaseConfigured(): void {
  if (
    isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  ) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
}

export function setupStatus(): {
  url: boolean;
  publishable: boolean;
  service: boolean;
  resend: boolean;
  appUrl: boolean;
} {
  return {
    url: !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishable: !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    service: !isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };
}

export function isSupabaseConfigured(): boolean {
  const s = setupStatus();
  return s.url && s.publishable;
}

// Mode demo lokal: aktif bila DEMO_MODE=true ATAU Supabase belum diset.
// Demo = DEV ONLY (data JSON lokal). Produksi wajib Supabase.
//
// B3 hardening: demo TIDAK PERNAH aktif di production — menutup backdoor
// password hardcoded (admin123/demo1234/...) bila env lupa diset di Vercel.
// Tanpa Supabase di production, app melempar SUPABASE_NOT_CONFIGURED
// (fail-closed) alih-alih membuka demo.
function isProduction(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  return process.env.NODE_ENV === "production";
}

let warnedDemo = false;

export function isDemoMode(): boolean {
  if (isProduction()) {
    if (process.env.DEMO_MODE === "true" && !warnedDemo) {
      warnedDemo = true;
      console.warn(
        "[security] DEMO_MODE=true diabaikan di production — demo tidak pernah aktif di production."
      );
    }
    return false;
  }
  const demo = process.env.DEMO_MODE === "true" || (process.env.DEMO_MODE !== "false" && !isSupabaseConfigured());
  if (demo && !warnedDemo) {
    warnedDemo = true;
    console.warn(
      "[demo] Mode demo AKTIF (DEV ONLY, kredensial demo). Jangan deploy mode ini ke production."
    );
  }
  return demo;
}

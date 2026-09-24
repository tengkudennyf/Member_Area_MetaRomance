import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { isDemoMode, setupStatus } from "@/lib/supabase/env";
import { Card, PageHeader } from "@/components/ui/kit";

export default function SetupPage() {
  const s = setupStatus();
  const done = s.url && s.publishable && s.service && s.brevo;
  const demo = isDemoMode() && !done;

  const rows: { label: string; ok: boolean; hint: string }[] = [
    {
      label: "NEXT_PUBLIC_SUPABASE_URL",
      ok: s.url,
      hint: "Project Settings → Data API → Project URL",
    },
    {
      label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ok: s.publishable,
      hint: "Project Settings → API Keys → publishable/anon",
    },
    {
      label: "SUPABASE_SERVICE_ROLE_KEY",
      ok: s.service,
      hint: "Project Settings → API Keys → service_role (server saja)",
    },
    {
      label: "BREVO_API_KEY (email transaksi aplikasi)",
      ok: s.brevo,
      hint: "Brevo → Settings → SMTP & API → API Keys. Tanpa ini email aplikasi di-skip.",
    },
    { label: "NEXT_PUBLIC_APP_URL", ok: s.appUrl, hint: "http://localhost:3001 lokal" },
  ];

  return (
    <div className="min-h-screen flex items-start md:items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <PageHeader
          title="Setup Supabase (±10 menit)"
          desc="Database adalah source of truth aplikasi ini. Sekali diset, semua flow jalan."
        />
        {demo && (
          <Card className="mb-4 border-accent/40">
            <p className="text-accent text-[13px] font-medium mb-1">Mode demo lokal AKTIF</p>
            <p className="text-faint text-[13px] leading-relaxed">
              Supabase belum diset, jadi aplikasi jalan dengan data contoh (tersimpan di{" "}
              <code>Member Area/Data/demo.json</code>). Login demo:{" "}
              <code className="text-foreground">demo@metaromance.com / demo1234</code> (member) atau{" "}
              <code className="text-foreground">admin@metaromance.com / admin123</code> (admin). Isi
              env di bawah kapan saja untuk pindah ke Supabase asli.
            </p>
          </Card>
        )}
        <Card className="mb-4">
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">
            Status env (.env.local)
          </p>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-2.5 text-[13px]">
                {r.ok ? (
                  <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                ) : (
                  <Circle size={16} className="text-faint shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={r.ok ? "text-foreground" : "text-faint"}>{r.label}</p>
                  {!r.ok && <p className="text-faint text-[12px]">{r.hint}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-4">
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">Langkah</p>
          <ol className="text-[13px] space-y-3 list-decimal list-inside text-foreground">
            <li>
              Buat project gratis di <span className="text-accent">supabase.com → New project</span>
              . Tunggu ±2 menit sampai project aktif.
            </li>
            <li>
              Buka <b>SQL Editor → New query</b>, jalankan isi file{" "}
              <code className="text-accent">supabase/migrations/0001_init.sql</code> (10 tabel + RLS
              + trigger), lalu <code className="text-accent">supabase/seed.sql</code> (12 produk + 4
              event + 5 buckets).
            </li>
            <li>
              Verifikasi: jalankan <code className="text-accent">supabase/tests/smoke.sql</code> per
              blok — harus 12 produk PUBLISHED, 4 event, 5 buckets, RLS on.
            </li>
            <li>
              <b>Project Settings → Data API / API Keys</b>: copy URL + publishable key +
              service_role key ke <code className="text-accent">member/.env.local</code> (copy dari
              `.env.example`).
            </li>
            <li>
              <b>Authentication → Sign In / Providers → Email</b>: pastikan Email provider ON.
            </li>
            <li>Restart dev server (`pnpm dev`), buka halaman ini lagi sampai semua ✅.</li>
            <li>
              Register 1 user, lalu jadikan admin: Table Editor →{" "}
              <code className="text-accent">profiles</code> → ubah `role` jadi `ADMIN`.
            </li>
          </ol>
        </Card>

        {done ? (
          <Card className="text-center">
            <p className="text-success text-[14px] mb-3">Env lengkap. Aplikasi siap jalan.</p>
            <Link
              href="/login"
              className="bg-accent text-[#202940] font-semibold text-[13px] px-5 py-3 rounded-xl inline-block"
            >
              Ke Login →
            </Link>
          </Card>
        ) : (
          <p className="text-faint text-[12px] text-center">
            Setelah isi .env.local, restart `pnpm dev` agar env terbaca ulang.
          </p>
        )}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Card, PageHeader } from "@/components/ui/kit";
import { SITE_CONTENT_KEYS, SITE_CONTENT_LABELS, SITE_CONTENT_DEFAULTS } from "@/lib/cms/defaults";
import type { SiteContent } from "@/types/db";

export default async function AdminContentsPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const { data } = await supabase.from("site_contents").select("*");
  const rows = new Map(((data ?? []) as SiteContent[]).map((r) => [r.key, r]));

  return (
    <AppShell mode="admin">
      <PageHeader
        title="Konten Website"
        desc="Edit teks front-end di sini — hero, testimoni, unggulan, override pilar & sinopsis ebook. Publish = langsung tampil di website utama (±1 mnt)."
      />
      <div className="grid md:grid-cols-2 gap-3">
        {SITE_CONTENT_KEYS.map((key) => {
          const row = rows.get(key);
          const published = (row?.status ?? "PUBLISHED") === "PUBLISHED";
          return (
            <Link key={key} href={`/admin/contents/${encodeURIComponent(key)}`}>
              <Card className="lift">
                <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-1">
                  {published ? "● Published" : "○ Draft"}
                </p>
                <p className="font-display text-[17px]">{SITE_CONTENT_LABELS[key] ?? key}</p>
                <p className="text-faint text-[12px] mt-1 font-mono">{key}</p>
                <p className="text-faint text-[12px] mt-2 line-clamp-2">
                  {row
                    ? `Terakhir diubah: ${new Date(row.updated_at).toLocaleString("id-ID")}`
                    : `Belum ada di DB — memakai default (${Object.keys(SITE_CONTENT_DEFAULTS[key] ?? {}).length} field). Klik untuk buat.`}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
      <Card className="mt-4">
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">Cara pakai</p>
        <ol className="text-faint text-[13px] leading-relaxed list-decimal list-inside space-y-1">
          <li>Katalog produk & event otomatis dari menu Products/Events (status PUBLISHED).</li>
          <li>Halaman ini untuk TEKS: hero, testimoni, dan override per pilar/ebook.</li>
          <li>Kosongkan string (&quot;&quot;) pada override pilar = pakai teks asli front.</li>
          <li>Front baca via <span className="font-mono">GET /api/public/site</span> (CORS terbuka, cache 60 dtk).</li>
        </ol>
      </Card>
    </AppShell>
  );
}

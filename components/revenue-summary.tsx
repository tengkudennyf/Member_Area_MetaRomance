import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/kit";
import { rp } from "@/lib/utils/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Ringkasan pendapatan di bawah dashboard admin (seluruh platform via policy admin).
export default async function RevenueSummary() {
  const db = await createClient();
  const { data } = await db
    .from("orders")
    .select("total, created_at")
    .eq("status", "PAID")
    .order("created_at", { ascending: true })
    .limit(2000);
  const rows = (data ?? []) as { total: number; created_at: string }[];
  if (rows.length === 0) return null;

  const now = new Date();
  const total = rows.reduce((a, r) => a + r.total, 0);
  const thisMonth = rows
    .filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((a, r) => a + r.total, 0);

  // 6 bulan terakhir untuk mini bar
  const buckets: { label: string; total: number }[] = [];
  for (let k = 5; k >= 0; k -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    buckets.push({ label: MONTHS[d.getMonth()]!, total: 0 });
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 5;
    if (idx >= 0 && idx < 6) buckets[idx]!.total += r.total;
  }
  const max = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[20px]">Pendapatan</h2>
        <Link href="/admin/revenue" className="text-accent text-[13px] hover:underline">
          Grafik lengkap →
        </Link>
      </div>
      <Card>
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          {[
            { l: "Total", v: rp(total) },
            { l: "Bulan ini", v: rp(thisMonth) },
            { l: "Order lunas", v: String(rows.length) },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-display text-[20px] md:text-[24px] text-accent">{s.v}</p>
              <p className="text-faint text-[11px] uppercase tracking-[0.12em] mt-1">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          {buckets.map((b) => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-16 rounded-md bg-surface2 flex items-end overflow-hidden">
                <div
                  className="w-full rounded-md bg-accent"
                  style={{ height: `${Math.max(0, Math.round((b.total / max) * 100))}%` }}
                  title={`${b.label}: ${rp(b.total)}`}
                />
              </div>
              <p className="text-faint text-[10px]">{b.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

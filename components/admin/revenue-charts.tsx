"use client";

import { useMemo, useState } from "react";
import { Card, Empty, Segmented } from "@/components/ui/kit";
import { rp } from "@/lib/utils/format";

export type RevenueRow = { total: number; at: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function Bar({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
      <p className="text-[11px] font-medium whitespace-nowrap">{value > 0 ? rp(value) : "—"}</p>
      <div className="w-full h-28 md:h-36 rounded-lg bg-surface2 flex items-end overflow-hidden">
        <div
          className="w-full rounded-lg bg-accent transition-all"
          style={{ height: `${value > 0 ? pct : 0}%` }}
          title={`${label}: ${rp(value)}`}
        />
      </div>
      <p className="text-faint text-[11px]">{label}</p>
      {sub && <p className="text-faint/70 text-[10px] -mt-1">{sub}</p>}
    </div>
  );
}

// Grafik CSS murni (tanpa lib chart): ringan & cukup untuk admin MVP.
export default function RevenueCharts({ rows, refunded }: { rows: RevenueRow[]; refunded: number }) {
  const years = useMemo(() => {
    const s = new Set(rows.map((r) => new Date(r.at).getFullYear()));
    const arr = [...s].sort((a, b) => b - a);
    return arr.length > 0 ? arr : [new Date().getFullYear()];
  }, [rows]);
  const [year, setYear] = useState(years[0]);

  const monthly = useMemo(() => {
    const m = Array.from({ length: 12 }, () => ({ total: 0, n: 0 }));
    for (const r of rows) {
      const d = new Date(r.at);
      if (d.getFullYear() !== year) continue;
      m[d.getMonth()]!.total += r.total;
      m[d.getMonth()]!.n += 1;
    }
    return m;
  }, [rows, year]);

  const yearly = useMemo(() => {
    const map = new Map<number, { total: number; n: number }>();
    for (const r of rows) {
      const y = new Date(r.at).getFullYear();
      const cur = map.get(y) ?? { total: 0, n: 0 };
      cur.total += r.total;
      cur.n += 1;
      map.set(y, cur);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  const totalAll = rows.reduce((a, r) => a + r.total, 0);
  const totalYear = monthly.reduce((a, m) => a + m.total, 0);
  const now = new Date();
  const totalMonth =
    year === now.getFullYear() ? (monthly[now.getMonth()]?.total ?? 0) : 0;
  const avg = rows.length > 0 ? Math.round(totalAll / rows.length) : 0;
  const maxMonth = Math.max(0, ...monthly.map((m) => m.total));
  const maxYear = Math.max(0, ...yearly.map(([, v]) => v.total));

  const stats = [
    { label: "Total pendapatan", value: rp(totalAll) },
    { label: `Tahun ${year}`, value: rp(totalYear) },
    { label: "Bulan berjalan", value: rp(totalMonth) },
    { label: `Rata-rata (${rows.length} order)`, value: rp(avg) },
  ];

  if (rows.length === 0) {
    return (
      <Empty
        title="Belum ada pendapatan"
        desc="Grafik muncul setelah ada order PAID (transfer terverifikasi admin)."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="text-center py-4">
            <p className="font-display text-[20px] md:text-[24px] text-accent">{s.value}</p>
            <p className="text-faint text-[11px] uppercase tracking-[0.12em] mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <div>
            <h2 className="font-display text-[18px]">Bulanan</h2>
            <p className="text-faint text-[12px]">Order lunas per bulan</p>
          </div>
          <Segmented
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>
        <div className="flex gap-1.5 md:gap-2.5 items-stretch overflow-x-auto pb-1">
          {monthly.map((m, i) => (
            <Bar key={i} value={m.total} max={maxMonth} label={MONTHS[i]!} sub={m.n > 0 ? `${m.n} order` : ""} />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-[18px]">Tahunan</h2>
        <p className="text-faint text-[12px] mb-5">Order lunas per tahun</p>
        <div className="flex gap-2 md:gap-3 items-stretch">
          {yearly.map(([y, v]) => (
            <Bar key={y} value={v.total} max={maxYear} label={String(y)} sub={`${v.n} order`} />
          ))}
        </div>
        {refunded > 0 && (
          <p className="text-faint text-[12px] mt-4">
            Catatan: {refunded} order REFUNDED tidak masuk grafik (grafik = PAID saja).
          </p>
        )}
      </Card>
    </div>
  );
}

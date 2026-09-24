"use client";

import Link from "next/link";
import { useState } from "react";
import { Btn, Card, Empty, Segmented } from "@/components/ui/kit";
import CoverImage from "@/components/ui/cover-image";
import { PILLAR_LABEL, type Pillar } from "@/types/db";
import { fmtDateTime, rp } from "@/lib/utils/format";
import { useLang } from "@/components/lang-provider";

export type StoreItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  pillar: Pillar;
  price: number;
  original_price: number | null;
  cover_path: string | null;
  product_type?: string;
  event_type?: string;
  platform?: string;
  start_at?: string;
  quota?: number | null;
  kind: "product" | "event";
};

type Pending = { key: string; orderId: string; status: string };

// Island filter + CTA sadar-status:
// owned/registered → Buka · order aktif → Lanjut Bayar · else → Beli/Daftar.
export default function StoreList({
  items,
  ownedProducts,
  registeredEvents,
  pending,
}: {
  items: StoreItem[];
  ownedProducts: string[];
  registeredEvents: string[];
  pending: Pending[];
}) {
  const [kind, setKind] = useState<"all" | "product" | "event">("all");
  const [pillar, setPillar] = useState("All");
  const { t } = useLang();
  const owned = new Set(ownedProducts);
  const registered = new Set(registeredEvents);
  const pendingMap = new Map(pending.map((p) => [p.key, p]));

  const PILLARS: { value: string; label: string }[] = [
    { value: "All", label: t.library.all },
    { value: "5D_CONSCIOUSNESS", label: "5D" },
    { value: "ROMANCE_ATTRACTION", label: "Romance" },
    { value: "FINANCIAL_CAREER", label: "Financial" },
    { value: "MANIFESTATION_TOOLS", label: "Manifest" },
  ];

  const filtered = items.filter(
    (i) =>
      (kind === "all" || i.kind === kind) && (pillar === "All" || i.pillar === pillar)
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: t.library.all },
            { value: "product", label: "Ebook" },
            { value: "event", label: t.nav.event },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Segmented
          value={pillar}
          onChange={setPillar}
          options={PILLARS}
        />
      </div>

      {filtered.length === 0 ? (
        <Empty title={t.common.empty} desc="" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((i) => {
            const isOwned =
              i.kind === "product" ? owned.has(i.id) : registered.has(i.id);
            const pend = pendingMap.get(`${i.kind === "product" ? "p" : "e"}:${i.id}`);
            return (
              <Card key={`${i.kind}-${i.id}`} className="lift flex flex-col">
                <Link href={`/member/store/${i.slug}`} className="block mb-3">
                  <CoverImage
                    bucket={i.kind === "product" ? "product-covers" : "event-covers"}
                    path={i.cover_path}
                    title={i.title}
                    ratio={i.kind === "product" ? "aspect-[3/4] max-h-56" : "aspect-[16/9]"}
                  />
                </Link>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-accent text-[10px] tracking-[0.14em] uppercase">
                    {PILLAR_LABEL[i.pillar]} · {i.kind === "product" ? (i.product_type ?? "Ebook") : (i.event_type ?? "Event")}
                  </p>
                  {isOwned && (
                    <span className="text-[10px] uppercase tracking-[0.1em] text-success border border-success/40 rounded-full px-2 py-0.5">
                      {t.store.owned}
                    </span>
                  )}
                  {!isOwned && pend && (
                    <span className="text-[10px] uppercase tracking-[0.1em] text-warning border border-warning/40 rounded-full px-2 py-0.5">
                      {t.store.waiting}
                    </span>
                  )}
                </div>
                <Link href={`/member/store/${i.slug}`} className="hover:underline underline-offset-4">
                  <h3 className="text-[15px] font-medium leading-snug">{i.title}</h3>
                </Link>
                <p className="text-faint text-[12px] leading-relaxed mt-1 line-clamp-2">
                  {i.description}
                </p>
                {i.kind === "event" && i.start_at && (
                  <p className="text-faint text-[11px] mt-2">📅 {fmtDateTime(i.start_at)}</p>
                )}
                <div className="flex items-baseline gap-2 mt-2 mb-4">
                  {i.original_price ? (
                    <span className="text-faint line-through text-[12px]">{rp(i.original_price)}</span>
                  ) : null}
                  <span className="font-display text-[18px] text-accent">{rp(i.price)}</span>
                </div>
                <div className="mt-auto">
                  {isOwned ? (
                    <Btn
                      variant="ghost"
                      href={i.kind === "product" ? `/member/products/${i.slug}` : `/member/events/${i.slug}`}
                      className="w-full"
                    >
                      {i.kind === "product" ? t.claim.openLibrary : t.store.detail}
                    </Btn>
                  ) : pend ? (
                    <Btn variant="ghost" href={`/payment/${pend.orderId}`} className="w-full">
                      {t.store.continuePay}
                    </Btn>
                  ) : (
                    <Btn href={`/checkout/${i.id}`} className="w-full">
                      {i.kind === "product" ? t.store.buyEbook : t.store.joinEvent}
                    </Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

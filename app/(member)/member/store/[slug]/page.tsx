import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell";
import { Btn, Card, PageHeader } from "@/components/ui/kit";
import CoverImage from "@/components/ui/cover-image";
import { PILLAR_LABEL } from "@/types/db";
import { fmtDateTime, rp } from "@/lib/utils/format"; import { getDictServer } from "@/lib/i18n/server";

// Detail item store: deskripsi penuh + ringkasan bayar. CTA sama dengan daftar:
// owned → Buka · order aktif → Lanjut Bayar · else → checkout manual.
export default async function StoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, profile } = await getSession();
  if (!user || !profile) redirect(`/login?next=/member/store/${slug}`);
  const { t } = await getDictServer();
  const db = await createClient();

  const { data: p } = await db.from("products").select("*").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  const product = p as {
    id: string; slug: string; title: string; description: string;
    pillar: "5D_CONSCIOUSNESS" | "ROMANCE_ATTRACTION" | "FINANCIAL_CAREER" | "MANIFESTATION_TOOLS";
    product_type: string; price: number; original_price: number | null; cover_path: string | null;
  } | null;
  const { data: e } = !product
    ? await db.from("events").select("*").eq("slug", slug).neq("status", "DRAFT").maybeSingle()
    : { data: null };
  const event = e as {
    id: string; slug: string; title: string; description: string;
    pillar: "5D_CONSCIOUSNESS" | "ROMANCE_ATTRACTION" | "FINANCIAL_CAREER" | "MANIFESTATION_TOOLS";
    event_type: string; platform: string; meeting_url: string | null;
    start_at: string; end_at: string; price: number; quota: number | null; status: string; cover_path: string | null;
  } | null;

  if (!product && !event) {
    return (
      <AppShell mode="member">
        <PageHeader title={t.storeDetail.notFound} desc={t.storeDetail.notFoundDesc} />
        <Link href="/member/store" className="text-accent hover:underline text-[13px]">{t.storeDetail.store}
        </Link>
      </AppShell>
    );
  }

  const isEvent = !product;
  const itemId = (product?.id ?? event?.id) as string;

  const [{ data: access }, { data: regs }, { data: orders }] = await Promise.all([
    !isEvent
      ? db.from("product_access").select("id").eq("user_id", profile.id).eq("product_id", itemId).eq("status", "ACTIVE").limit(1)
      : Promise.resolve({ data: null }),
    isEvent
      ? db.from("event_registrations").select("id").eq("user_id", profile.id).eq("event_id", itemId).eq("status", "REGISTERED").limit(1)
      : Promise.resolve({ data: null }),
    db.from("orders").select("id, status").eq("user_id", profile.id).in("status", ["PENDING_PAYMENT", "WAITING_VERIFICATION"]),
  ]);
  const isOwned = Boolean((access ?? []).length > 0 || (regs ?? []).length > 0);

  let pendingOrder: string | null = null;
  const orderIds = ((orders ?? []) as { id: string }[]).map((o) => o.id);
  if (orderIds.length > 0) {
    const col = isEvent ? "event_id" : "product_id";
    const { data: items } = await db.from("order_items").select(`order_id, ${col}`).in("order_id", orderIds).eq(col, itemId).limit(1);
    const first = ((items ?? []) as { order_id: string }[])[0];
    if (first) pendingOrder = first.order_id;
  }

  const title = product?.title ?? event?.title ?? "";
  const desc = product?.description ?? event?.description ?? "";
  const price = product?.price ?? event?.price ?? 0;
  const originalPrice = product?.original_price ?? null;

  return (
    <AppShell mode="member">
      <Link href="/member/store" className="text-faint hover:text-accent text-[12px] transition">{t.storeDetail.store}
      </Link>
      <div className="mt-3">
        <PageHeader
          title={title}
          desc={`${PILLAR_LABEL[(product?.pillar ?? event?.pillar) as "5D_CONSCIOUSNESS"]} · ${isEvent ? (event?.event_type ?? "Event") : (product?.product_type ?? "Ebook")}`}
        />
      </div>

      <Card className="mb-4">
        <CoverImage
          bucket={isEvent ? "event-covers" : "product-covers"}
          path={isEvent ? (event?.cover_path ?? null) : (product?.cover_path ?? null)}
          title={title}
          ratio={isEvent ? "aspect-[16/7]" : "aspect-[16/10]"}
          className="mb-4"
        />
        {isEvent && event && (
          <div className="grid grid-cols-2 gap-2 mb-4 text-[12px]">
            <div className="bg-background border border-border rounded-xl px-3 py-2">
              <p className="text-faint text-[10px] uppercase tracking-[0.12em]">{t.storeDetail.schedule}</p>
              <p className="mt-0.5">{fmtDateTime(event.start_at)}</p>
            </div>
            <div className="bg-background border border-border rounded-xl px-3 py-2">
              <p className="text-faint text-[10px] uppercase tracking-[0.12em]">{t.storeDetail.platform}</p>
              <p className="mt-0.5">{event.platform}{event.quota != null ? ` · Kuota ${event.quota}` : ""}</p>
            </div>
          </div>
        )}
        <p className="text-[13px] leading-relaxed whitespace-pre-line">{desc}</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-faint text-[11px] uppercase tracking-[0.12em]">{t.storeDetail.totalPay}</p>
            <p>
              {originalPrice ? (
                <span className="text-faint line-through text-[13px] mr-2">{rp(originalPrice)}</span>
              ) : null}
              <span className="font-display text-[24px] text-accent">{rp(price)}</span>
            </p>
            <p className="text-faint text-[11px] mt-1">{t.storeDetail.transferNote}</p>
          </div>
          <div className="flex-1 min-w-44">
            {isOwned ? (
              <Btn
                variant="ghost"
                href={isEvent ? `/member/events/${event?.slug}` : `/member/products/${product?.slug}`}
                className="w-full"
              >
                {isEvent ? t.store.detail : t.claim.openLibrary}
              </Btn>
            ) : pendingOrder ? (
              <Btn variant="ghost" href={`/payment/${pendingOrder}`} className="w-full">
                {t.store.continuePay}</Btn>
            ) : (
              <Btn href={`/checkout/${itemId}`} className="w-full">
                {isEvent ? t.store.joinEvent : t.storeDetail.buyNow}
              </Btn>
            )}
          </div>
        </div>
      </Card>
    </AppShell>
  );
}







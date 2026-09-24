import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui/kit";
import StoreList, { type StoreItem } from "@/components/store/store-list";
import { getDictServer } from "@/lib/i18n/server";

// Store member: katalog produk + event yang bisa dibeli dari dalam Member Area.
// Pembelian TETAP manual: checkout → transfer → upload bukti → verifikasi admin
// (actions/orders.ts). Tidak ada payment gateway di sini.
export default async function StorePage() {
  const { user, profile } = await getSession();
  if (!user || !profile) redirect("/login?next=/member/store");
  const db = await createClient();

  const [{ data: products }, { data: events }] = await Promise.all([
    db.from("products").select("*").eq("status", "PUBLISHED").order("created_at"),
    db.from("events").select("*").neq("status", "DRAFT").order("start_at"),
  ]);

  const [{ data: access }, { data: regs }, { data: orders }] = await Promise.all([
    db.from("product_access").select("product_id").eq("user_id", profile.id).eq("status", "ACTIVE"),
    db.from("event_registrations").select("event_id").eq("user_id", profile.id).eq("status", "REGISTERED"),
    db
      .from("orders")
      .select("id, status")
      .eq("user_id", profile.id)
      .in("status", ["PENDING_PAYMENT", "WAITING_VERIFICATION"]),
  ]);

  const ownedProducts = new Set((access ?? []).map((a: { product_id: string }) => a.product_id));
  const registeredEvents = new Set((regs ?? []).map((r: { event_id: string }) => r.event_id));

  // Order aktif per item → tombol "Lanjut Bayar" (bukan beli dobel).
  const activeOrderIds = (orders ?? []).map((o: { id: string }) => o.id);
  const pendingByItem = new Map<string, { orderId: string; status: string }>();
  if (activeOrderIds.length > 0) {
    const { data: items } = await db
      .from("order_items")
      .select("order_id, product_id, event_id")
      .in("order_id", activeOrderIds);
    const statusByOrder = new Map((orders ?? []).map((o: { id: string; status: string }) => [o.id, o.status]));
    for (const it of (items ?? []) as { order_id: string; product_id: string | null; event_id: string | null }[]) {
      const key = it.product_id ? `p:${it.product_id}` : it.event_id ? `e:${it.event_id}` : null;
      if (key && !pendingByItem.has(key))
        pendingByItem.set(key, { orderId: it.order_id, status: statusByOrder.get(it.order_id) ?? "" });
    }
  }

  const list: StoreItem[] = [
    ...((products ?? []) as StoreItem[]).map((p) => ({ ...p, kind: "product" as const })),
    ...((events ?? []) as StoreItem[]).map((e) => ({ ...e, kind: "event" as const })),
  ];

  const { t } = await getDictServer();

  return (
    <AppShell mode="member">
      <PageHeader
        title={t.store.title}
        desc={t.store.desc}
      />
      <StoreList
        items={list}
        ownedProducts={[...ownedProducts]}
        registeredEvents={[...registeredEvents]}
        pending={[...pendingByItem.entries()].map(([key, v]) => ({ key, ...v }))}
      />
    </AppShell>
  );
}

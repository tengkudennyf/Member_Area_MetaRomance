import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyUser } from "@/lib/email/send";

type GuestOrder = { id: string; order_number: string };
type OrderItem = { product_id: string | null; event_id: string | null; item_type: string; title_snapshot: string };

// Klaim order TAMU (user_id NULL, status PAID, guest_email cocok) ke profil.
// Dipanggil SETELAH user terautentikasi & email terverifikasi (login /
// konfirmasi) — aman karena kepemilikan email sudah dibuktikan.
// Idempotent: order yang sudah tertaut & akses yang sudah ada dilewati.
export async function claimGuestOrders(
  svc: SupabaseClient,
  input: { profileId: string; email: string }
): Promise<{ claimed: number; titles: string[] }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { claimed: 0, titles: [] };

  const { data: orders } = await svc
    .from("orders")
    .select("id, order_number")
    .eq("status", "PAID")
    .is("user_id", null)
    .ilike("guest_email", email);
  const list = ((orders ?? []) as GuestOrder[]).filter((o) => o.id);
  if (list.length === 0) return { claimed: 0, titles: [] };

  const titles: string[] = [];
  let claimed = 0;
  for (const order of list) {
    const { data: items } = await svc
      .from("order_items")
      .select("product_id, event_id, item_type, title_snapshot")
      .eq("order_id", order.id);
    const orderItems = (items ?? []) as OrderItem[];

    for (const it of orderItems) {
      if (it.item_type === "PRODUCT" && it.product_id) {
        const { data: existing } = await svc
          .from("product_access")
          .select("id")
          .eq("user_id", input.profileId)
          .eq("product_id", it.product_id)
          .eq("status", "ACTIVE")
          .limit(1);
        if (!existing || existing.length === 0) {
          await svc.from("product_access").insert({
            user_id: input.profileId,
            product_id: it.product_id,
            order_id: order.id,
            source: "PURCHASE",
            status: "ACTIVE",
          });
        }
        titles.push(it.title_snapshot);
      } else if (it.item_type === "EVENT" && it.event_id) {
        const { data: existing } = await svc
          .from("event_registrations")
          .select("id")
          .eq("event_id", it.event_id)
          .eq("user_id", input.profileId)
          .eq("status", "REGISTERED")
          .limit(1);
        if (!existing || existing.length === 0) {
          await svc.from("event_registrations").insert({
            event_id: it.event_id,
            user_id: input.profileId,
            order_id: order.id,
            status: "REGISTERED",
          });
        }
        titles.push(it.title_snapshot);
      }
    }

    await svc.from("orders").update({ user_id: input.profileId }).eq("id", order.id);
    claimed += 1;
  }

  if (claimed > 0) {
    await notifyUser(
      svc as unknown as {
        from: (t: string) => { insert: (v: Record<string, unknown>) => PromiseLike<unknown> };
      },
      {
        user_id: input.profileId,
        type: "guest_claimed",
        title: "Pembelian tamu ditautkan",
        message:
          claimed === 1
            ? `"${titles[0] ?? "produk"}" kini ada di Library Anda.`
            : `${claimed} pembelian tamu (${titles.slice(0, 3).join(", ")}) kini ada di akun Anda.`,
        href: "/member/products",
      }
    );
  }
  return { claimed, titles };
}

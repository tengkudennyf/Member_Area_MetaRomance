import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Badge, Card } from "@/components/ui/kit";
import { ORDER_BADGE, ORDER_LABEL, fmtDateTime, rp } from "@/lib/utils/format";
import VerifyPanel from "@/components/orders/verify-panel";
import LinkOrderForm from "@/components/orders/link-order-form";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const svc = createServiceClient();
  const { data: orderRaw } = await svc.from("orders").select("*").eq("id", id).single();
  const order = orderRaw as unknown as {
    id: string;
    order_number: string;
    user_id: string | null;
    guest_name: string | null;
    guest_email: string | null;
    guest_phone: string | null;
    source: string;
    status: string;
    created_at: string;
  } | null;
  if (!order) redirect("/admin/orders");
  const { data: buyer } = order.user_id
    ? await svc.from("profiles").select("name, email, phone").eq("id", order.user_id).single()
    : { data: null };
  const customer = (buyer as { name: string; email: string; phone: string } | null) ?? {
    name: `${order.guest_name ?? "Tamu"} (order via website)`,
    email: order.guest_email ?? "—",
    phone: order.guest_phone ?? "—",
  };
  const { data: items } = await svc.from("order_items").select("*").eq("order_id", id);
  const { data: payment } = await svc.from("payments").select("*").eq("order_id", id).single();

  // Signed URL bukti (admin-only, 15 menit)
  let proofUrl: string | null = null;
  if (payment?.proof_path) {
    const { data } = await svc.storage
      .from("payment-proofs")
      .createSignedUrl(payment.proof_path, 900);
    proofUrl = data?.signedUrl ?? null;
  }

  return (
    <AppShell mode="admin">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-display text-[22px]">Order {order.order_number}</h2>
        <Badge tone={ORDER_BADGE[order.status] ?? ""}>
          {ORDER_LABEL[order.status] ?? order.status}
        </Badge>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">Customer</p>
          <p className="text-[14px]">{customer?.name}</p>
          <p className="text-faint text-[13px]">{customer?.email}</p>
          <p className="text-faint text-[13px]">{customer?.phone}</p>
          {!order.user_id && order.status === "PAID" && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-faint text-[12px] mb-2">
                Order tamu tanpa akun (mis. typo email). Tautkan manual ke akun member:
              </p>
              <LinkOrderForm orderId={order.id} guestEmail={order.guest_email} />
            </div>
          )}
        </Card>
        <Card>
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">Order</p>
          {(items ?? []).map(
            (it: { id: string; title_snapshot: string; price_snapshot: number }) => (
              <p key={it.id} className="text-[13px]">
                {it.title_snapshot} — {rp(it.price_snapshot)}
              </p>
            )
          )}
          <p className="text-faint text-[12px] mt-2">Dibuat {fmtDateTime(order.created_at)}</p>
          {payment?.verified_at && (
            <p className="text-faint text-[12px]">
              Diverifikasi {fmtDateTime(payment.verified_at)}
            </p>
          )}
        </Card>
      </div>
      <Card className="mt-3">
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">Payment Proof</p>
        {proofUrl ? (
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="block border border-border rounded-xl overflow-hidden"
          >
            <img src={proofUrl} alt="Bukti pembayaran" className="max-h-80 mx-auto" />
          </a>
        ) : (
          <p className="text-faint text-[13px]">Belum ada bukti.</p>
        )}
        {(order.status === "WAITING_VERIFICATION" || order.status === "PENDING_PAYMENT") && (
          <div className="mt-4">
            <VerifyPanel orderId={order.id} orderNumber={order.order_number} hasProof={!!proofUrl} />
          </div>
        )}
      </Card>
    </AppShell>
  );
}

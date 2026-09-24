import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { Badge, Btn, Card, PageHeader } from "@/components/ui/kit";
import { ORDER_BADGE, ORDER_LABEL, fmtDateTime, rp } from "@/lib/utils/format";
import { getDictServer } from "@/lib/i18n/server";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile, supabase } = await getSession();
  if (!user || !profile) redirect(`/login?next=/member/orders/${id}`);

  const { data: orderRaw } = await supabase.from("orders").select("*").eq("id", id).single();
  const order = orderRaw as unknown as {
    id: string;
    order_number: string;
    user_id: string;
    total: number;
    status: string;
    created_at: string;
  } | null;
  if (!order || (order.user_id !== profile.id && profile.role !== "ADMIN"))
    redirect("/member/orders");
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
  const { data: payment } = await supabase.from("payments").select("*").eq("order_id", id).single();
  const { t } = await getDictServer();

  return (
    <AppShell mode="member">
      <Link
        href="/member/orders"
        className="inline-flex items-center gap-2 text-faint hover:text-accent text-[13px] transition mb-4"
      >
        <ArrowLeft size={15} /> {t.orders.title}
      </Link>
      <PageHeader
        title={order.order_number}
        desc={t.orderDetail.created.replace("{date}", fmtDateTime(order.created_at))}
        action={
          <Badge tone={ORDER_BADGE[order.status] ?? ""}>
            {ORDER_LABEL[order.status] ?? order.status}
          </Badge>
        }
      />
      <Card className="mb-4">
        {(items ?? []).map((it: { id: string; title_snapshot: string; price_snapshot: number }) => (
          <div key={it.id} className="flex justify-between gap-4 text-[14px] py-1">
            <span>{it.title_snapshot}</span>
            <span className="text-accent font-medium">{rp(it.price_snapshot)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border mt-3 pt-3">
          <span className="text-faint text-[14px]">{t.orderDetail.total}</span>
          <span className="font-display text-[18px] text-accent">{rp(order.total)}</span>
        </div>
      </Card>
      <Card>
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">{t.orderDetail.payment}</p>
        <p className="text-faint text-[13px]">
          {t.orderDetail.method}: {payment?.payment_method ?? "Bank Transfer"}
        </p>
        <p className="text-faint text-[13px] mt-1">
          {t.orderDetail.proof}: {payment?.proof_path ? t.orderDetail.uploaded : t.orderDetail.notUploaded}
          {payment?.rejection_reason ? `${t.orderDetail.rejectReason}${payment.rejection_reason}` : ""}
        </p>
        {(order.status === "PENDING_PAYMENT" || order.status === "REJECTED") && (
          <div className="mt-4">
            <Btn href={`/payment/${order.id}`}>
              {order.status === "REJECTED" ? t.orderDetail.reupload : t.orderDetail.uploadProof}
            </Btn>
          </div>
        )}
      </Card>
    </AppShell>
  );
}

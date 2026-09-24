import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { Badge, Card, PageHeader } from "@/components/ui/kit";
import { ORDER_BADGE, ORDER_LABEL, rp, waHelpLink } from "@/lib/utils/format";
import { getDictServer } from "@/lib/i18n/server";
import ProofUpload from "@/components/orders/proof-upload";
import CopyRekeningButton from "@/components/orders/copy-rekening-button";

export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { user, profile, supabase } = await getSession();
  if (!user || !profile) redirect(`/login?next=/payment/${orderId}`);

  const { data: orderRaw } = await supabase.from("orders").select("*").eq("id", orderId).single();
  const order = orderRaw as unknown as {
    id: string;
    order_number: string;
    user_id: string;
    total: number;
    status: string;
  } | null;
  if (!order || order.user_id !== profile.id) redirect("/member/orders");
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .single();
  const { data: settings } = await supabase.from("app_settings").select("key, value");
  const get = (k: string, fb: string) => {
    const row = (settings ?? []).find((s: { key: string }) => s.key === k) as
      { value: string } | undefined;
    try {
      return row ? (JSON.parse(row.value) as string) : fb;
    } catch {
      return fb;
    }
  };
  // bank_account bisa array baru [{bank, number, name}] atau string lama.
  const getBanks = (): { bank: string; number: string; name: string }[] | null => {
    const row = (settings ?? []).find((s: { key: string }) => s.key === "bank_account") as
      { value: string } | undefined;
    if (!row) return null;
    try {
      const v = JSON.parse(row.value) as unknown;
      if (Array.isArray(v)) {
        const rows = v
          .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
          .map((r) => ({
            bank: String(r.bank ?? ""),
            number: String(r.number ?? ""),
            name: String(r.name ?? ""),
          }))
          .filter((r) => r.bank || r.number);
        return rows.length > 0 ? rows : null;
      }
    } catch {
      /* fallback string lama di bawah */
    }
    return null;
  };
  const banks = getBanks();
  const legacyBank = banks ? "" : get("bank_account", "");
  const supportContact = get("support_contact", "");
  const { lang, t } = await getDictServer();
  // Template siap kirim: order + item + total + data pembeli.
  const itemLines = ((items ?? []) as { title_snapshot: string; price_snapshot: number }[]).map(
    (it) => `- ${it.title_snapshot} (${rp(it.price_snapshot)})`
  );
  const waTemplate = [
    lang === "en" ? "Hi Meta Romance, I need help with my payment." : "Halo Meta Romance, saya butuh bantuan pembayaran.",
    "",
    `Order: ${order.order_number}`,
    `${t.account.name}: ${profile.name}`,
    `Email: ${profile.email}`,
    "Item:",
    ...(itemLines.length > 0 ? itemLines : ["- (lihat order)"]),
    `Total: ${rp(order.total)}`,
  ].join("\n");
  const waLink = waHelpLink(supportContact, waTemplate);

  return (
    <AppShell mode="member">
      <PageHeader
        title={`Payment ${order.order_number}`}
        desc={`Total ${rp(order.total)} · ${get("payment_instruction", "")}`}
        action={
          <Badge tone={ORDER_BADGE[order.status] ?? ""}>
            {ORDER_LABEL[order.status] ?? order.status}
          </Badge>
        }
      />
      <Card className="mb-4">
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">{t.payment.transferTo}</p>
        {banks ? (
          <div className="space-y-3">
            {banks.map((b, i) => (
              <div key={i} className="flex flex-col items-start gap-2">
                <p className="text-[15px]">
                  <span className="font-medium">{b.bank}</span> · {b.number}
                  {b.name && <span className="text-faint"> a.n. {b.name}</span>}
                </p>
                {b.number && <CopyRekeningButton number={b.number} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[15px]">{legacyBank}</p>
            {legacyBank && <CopyRekeningButton number={legacyBank} />}
          </div>
        )}
        {(items ?? []).map((it: { id: string; title_snapshot: string; price_snapshot: number }) => (
          <p key={it.id} className="text-faint text-[13px] mt-1">
            {it.title_snapshot} — {rp(it.price_snapshot)}
          </p>
        ))}
        <p className="text-faint text-[12px] mt-3">{t.payment.needHelp} {supportContact}</p>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium rounded-md px-4 py-2 border border-success/40 text-success hover:bg-success/10 transition"
          >
            <MessageCircle size={15} /> {t.payment.chatAdmin}
          </a>
        )}
      </Card>
      <Card>
        {payment?.proof_path ? (
          <div>
            <p className="text-[14px] mb-1">{t.payment.proofSent}</p>
            <p className="text-faint text-[13px]">{t.payment.paymentStatus}: {payment.status}</p>
          </div>
        ) : (
          <ProofUpload orderId={order.id} />
        )}
      </Card>
    </AppShell>
  );
}

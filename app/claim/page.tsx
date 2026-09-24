import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { claimGuestOrders } from "@/lib/orders/claim";
import { Btn, Card } from "@/components/ui/kit";
import { rp } from "@/lib/utils/format";
import { getDictServer } from "@/lib/i18n/server";

// Link claim dari email approve tamu: /claim?o=MR-..&e=email
// - Belum login → info order + tombol Login/Daftar (next balik ke sini).
// - Sudah login + email cocok → klaim otomatis → kartu sukses + tombol Library.
// - Email tidak cocok / order tak ada → pesan generik (anti-enumerasi).
export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string; e?: string }>;
}) {
  const { o, e } = await searchParams;
  const orderNo = (o ?? "").trim();
  const email = (e ?? "").trim().toLowerCase();
  const back = `/claim?o=${encodeURIComponent(orderNo)}&e=${encodeURIComponent(email)}`;
  const { t } = await getDictServer();

  const fail = (msg: string) => (
    <Shell title={t.claim.invalid}>
      <p className="text-faint text-[13px] mb-6">{msg}</p>
      <Link href="/login" className="text-accent hover:underline text-[13px]">
        {t.claim.toLogin}
      </Link>
    </Shell>
  );

  if (!orderNo || !email.includes("@"))
    return fail(t.claim.incomplete);

  const svc = createServiceClient();
  const { data: orderRaw } = await svc
    .from("orders")
    .select("id, order_number, total, status, guest_email, user_id")
    .eq("order_number", orderNo)
    .maybeSingle();
  const order = orderRaw as unknown as {
    id: string;
    order_number: string;
    total: number;
    status: string;
    guest_email: string | null;
    user_id: string | null;
  } | null;
  if (!order) return fail(t.claim.orderNotFound);

  let ownerEmail = order.guest_email?.toLowerCase() ?? null;
  if (order.user_id) {
    const { data: prof } = await svc.from("profiles").select("email").eq("id", order.user_id).single();
    ownerEmail = ((prof as { email: string } | null)?.email ?? "").toLowerCase() || ownerEmail;
  }
  if (ownerEmail !== email) return fail(t.claim.orderNotFound);
  if (!["PAID", "WAITING_VERIFICATION", "PENDING_PAYMENT"].includes(order.status))
    return fail(t.claim.statusLine.replace("{status}", order.status));

  const { data: items } = await svc
    .from("order_items")
    .select("title_snapshot, price_snapshot, item_type")
    .eq("order_id", order.id);
  const titles = ((items ?? []) as { title_snapshot: string }[]).map((i) => i.title_snapshot);

  // "Login atau daftar dengan {email} — ..." → render email tebal.
  const loginHint = t.claim.loginAsPurchase.split("{email}");

  const { user, profile } = await getSession();
  if (!user || !profile) {
    return (
      <Shell title={t.claim.paidTitle}>
        <div className="text-left mb-5">
          {titles.map((t) => (
            <p key={t} className="text-[14px] mb-1">
              • {t}
            </p>
          ))}
          <p className="text-faint text-[13px] mt-2">
            {order.order_number} · {rp(order.total)}
            {order.status !== "PAID" ? ` ${t.claim.waitingNote}` : ""}
          </p>
        </div>
        {order.status === "PAID" ? (
          <>
            <p className="text-faint text-[13px] mb-4">
              {loginHint[0]}
              <b>{email}</b>
              {loginHint[1] ?? ""}
            </p>
            <div className="flex flex-col gap-2">
              <Btn href={`/login?next=${encodeURIComponent(back)}`} className="w-full">
                {t.claim.loginOpen}
              </Btn>
              <Btn href={`/register?next=${encodeURIComponent(back)}`} variant="ghost" className="w-full">
                {t.claim.noAccountRegister}
              </Btn>
            </div>
          </>
        ) : (
          <>
            <p className="text-faint text-[13px] mb-4">
              {t.claim.notVerified}
            </p>
            <Btn href={`/login?next=${encodeURIComponent(back)}`} variant="ghost" className="w-full">
              {t.claim.login}
            </Btn>
          </>
        )}
      </Shell>
    );
  }

  // Sudah login: email sesi HARUS sama dengan email pembelian.
  // S9: jangan tampilkan email target — cukup pesan generik (anti-enumerasi:
  // attacker tak bisa verifikasi apakah email X pernah beli).
  if (profile.email.toLowerCase() !== email) {
    return fail(t.claim.notYours);
  }

  const r = await claimGuestOrders(svc, { profileId: profile.id, email: profile.email });
  const hasEvent = ((items ?? []) as { item_type: string }[]).some((i) => i.item_type === "EVENT");

  return (
    <Shell title={r.claimed > 0 || titles.length > 0 ? t.claim.claimedTitle : t.claim.linkedTitle}>
      <div className="text-left mb-5">
        {titles.map((t) => (
          <p key={t} className="text-[14px] mb-1">
            • {t}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Btn href={hasEvent ? "/member/events" : "/member/products"} className="w-full">
          {hasEvent ? t.claim.openEvents : t.claim.openLibrary}
        </Btn>
        <Btn href="/member" variant="ghost" className="w-full">
          {t.claim.dashboard}
        </Btn>
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <p className="font-display text-[20px] mb-4">{title}</p>
        {children}
      </Card>
    </div>
  );
}

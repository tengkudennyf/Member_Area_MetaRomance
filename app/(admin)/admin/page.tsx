import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Card, PageHeader } from "@/components/ui/kit";
import RevenueSummary from "@/components/revenue-summary";
import { ORDER_LABEL, fmtDateTime } from "@/lib/utils/format";

export default async function AdminDashboard() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }

  const [
    { count: users },
    { count: orders },
    { count: waiting },
    { count: activeProducts },
    { count: upcomingEvents },
    { data: recentOrders },
    { data: recentPayments },
    { data: recentRegs },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact" }).eq("role", "USER"),
    supabase.from("orders").select("id", { count: "exact" }),
    supabase.from("orders").select("id", { count: "exact" }).eq("status", "WAITING_VERIFICATION"),
    supabase.from("products").select("id", { count: "exact" }).eq("status", "PUBLISHED"),
    supabase.from("events").select("id", { count: "exact" }).eq("status", "UPCOMING"),
    supabase
      .from("orders")
      .select("id, order_number, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("id, order_id, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("event_registrations")
      .select("id, event_id, registered_at")
      .order("registered_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { n: users ?? 0, l: "Total Users", href: "/admin/users" },
    { n: orders ?? 0, l: "Orders", href: "/admin/orders" },
    { n: waiting ?? 0, l: "Waiting Verification", href: "/admin/orders" },
    { n: activeProducts ?? 0, l: "Active Products", href: "/admin/products" },
    { n: upcomingEvents ?? 0, l: "Upcoming Events", href: "/admin/events" },
  ];

  return (
    <AppShell mode="admin">
      <PageHeader title="Overview" desc="Operasi harian tanpa SQL manual." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {stats.map((s) => (
          <Link key={s.l} href={s.href}>
            <Card className="lift text-center">
              <p className="font-display text-[30px] text-accent">{s.n}</p>
              <p className="text-faint text-[12px] mt-1">{s.l}</p>
            </Card>
          </Link>
        ))}
      </div>
      <h2 className="font-display text-[20px] mb-3">Recent Activity</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <Card>
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">Recent orders</p>
          {(recentOrders ?? []).map(
            (o: { id: string; order_number: string; status: string; created_at: string }) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="block py-1.5 border-b border-border last:border-0"
              >
                <span className="text-accent text-[13px]">{o.order_number}</span>
                <span className="block text-faint text-[11px]">
                  {ORDER_LABEL[o.status] ?? o.status} · {fmtDateTime(o.created_at)}
                </span>
              </Link>
            )
          )}
          {(recentOrders ?? []).length === 0 && (
            <p className="text-faint text-[13px]">Belum ada.</p>
          )}
        </Card>
        <Card>
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">
            Recent payments
          </p>
          {(recentPayments ?? []).map(
            (p: { id: string; order_id: string; status: string; submitted_at: string }) => (
              <p key={p.id} className="py-1.5 border-b border-border last:border-0 text-[13px]">
                {p.status}
                <span className="block text-faint text-[11px]">{fmtDateTime(p.submitted_at)}</span>
              </p>
            )
          )}
          {(recentPayments ?? []).length === 0 && (
            <p className="text-faint text-[13px]">Belum ada.</p>
          )}
        </Card>
        <Card>
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">
            Recent registrations
          </p>
          {(recentRegs ?? []).map((r: { id: string; event_id: string; registered_at: string }) => (
            <p key={r.id} className="py-1.5 border-b border-border last:border-0 text-[13px]">
              Registrasi event
              <span className="block text-faint text-[11px]">{fmtDateTime(r.registered_at)}</span>
            </p>
          ))}
          {(recentRegs ?? []).length === 0 && <p className="text-faint text-[13px]">Belum ada.</p>}
        </Card>
      </div>
      <RevenueSummary />
    </AppShell>
  );
}

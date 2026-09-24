import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui/kit";
import { AdminOrdersTable, type OrderRow } from "@/components/orders/orders-table";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  // Service client: admin harus lihat SEMUA order termasuk tamu website (user_id NULL
  // yang tidak lolos RLS "own"). Halaman ini sudah dijaga requireAdmin di atas.
  const svc = createServiceClient();
  const { data: orders } = await svc
    .from("orders")
    .select("id, order_number, total, status, created_at, user_id, guest_name, source")
    .order("created_at", { ascending: false })
    .limit(200);
  const ids = (orders ?? []).map((o: { id: string }) => o.id);
  const { data: items } = ids.length
    ? await svc.from("order_items").select("order_id, title_snapshot").in("order_id", ids)
    : { data: [] };
  const userIds = ((orders ?? []) as { user_id: string | null }[])
    .map((o) => o.user_id)
    .filter((v): v is string => Boolean(v));
  const { data: profiles } = userIds.length
    ? await svc.from("profiles").select("id, name").in("id", userIds)
    : { data: [] };

  const titleOf = (oid: string) =>
    ((items ?? []) as { order_id: string; title_snapshot: string }[])
      .filter((i) => i.order_id === oid)
      .map((i) => i.title_snapshot)
      .join(", ");
  const nameOf = (o: { user_id: string | null; guest_name: string | null; source: string }) => {
    if (o.user_id) {
      const found = ((profiles ?? []) as { id: string; name: string }[]).find((p) => p.id === o.user_id);
      if (found) return found.name;
    }
    if (o.guest_name) return `${o.guest_name} (web)`;
    return "—";
  };

  const rows: OrderRow[] = (
    (orders ?? []) as {
      id: string;
      order_number: string;
      total: number;
      status: string;
      created_at: string;
      user_id: string | null;
      guest_name: string | null;
      source: string;
    }[]
  ).map((o) => ({ ...o, title: titleOf(o.id), customer: nameOf(o) }));

  return (
    <AppShell mode="admin">
      <PageHeader title="Orders" desc="Antrean verifikasi + semua transaksi." />
      <AdminOrdersTable data={rows} />
    </AppShell>
  );
}

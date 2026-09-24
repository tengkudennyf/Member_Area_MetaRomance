import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui/kit";
import { MemberOrdersTable, type OrderRow } from "@/components/orders/orders-table";
import { getDictServer } from "@/lib/i18n/server";

export default async function MemberOrdersPage() {
  const { user, profile, supabase } = await getSession();
  if (!user || !profile) redirect("/login?next=/member/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total, status, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, title_snapshot")
    .in(
      "order_id",
      (orders ?? []).map((o: { id: string }) => o.id)
    );
  const titleOf = (oid: string) =>
    (items ?? [])
      .filter((i: { order_id: string }) => i.order_id === oid)
      .map((i: { title_snapshot: string }) => i.title_snapshot)
      .join(", ");

  const rows: OrderRow[] = (
    (orders ?? []) as {
      id: string;
      order_number: string;
      total: number;
      status: string;
      created_at: string;
    }[]
  ).map((o) => ({ ...o, title: titleOf(o.id) }));

  const { t } = await getDictServer();

  return (
    <AppShell mode="member">
      <PageHeader title={t.orders.title} desc={t.orders.desc} />
      <MemberOrdersTable data={rows} />
    </AppShell>
  );
}

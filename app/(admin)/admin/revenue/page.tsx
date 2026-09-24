import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui/kit";
import RevenueCharts from "@/components/admin/revenue-charts";

// Pendapatan = order berstatus PAID (manual transfer terverifikasi).
// Ditolak/dibatalkan/refund TIDAK masuk grafik (refund dicatat terpisah).
export default async function RevenuePage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }

  const { data: paid } = await supabase
    .from("orders")
    .select("id, total, created_at")
    .eq("status", "PAID")
    .order("created_at", { ascending: true })
    .limit(5000);
  const { count: refunded } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "REFUNDED");

  const rows = ((paid ?? []) as { id: string; total: number; created_at: string }[]).map((o) => ({
    total: o.total,
    at: o.created_at,
  }));

  return (
    <AppShell mode="admin">
      <PageHeader
        title="Pendapatan"
        desc="Order lunas (transfer manual terverifikasi). Grafik bulanan & tahunan."
      />
      <RevenueCharts rows={rows} refunded={refunded ?? 0} />
    </AppShell>
  );
}

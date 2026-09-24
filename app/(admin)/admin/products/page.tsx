import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Btn, PageHeader } from "@/components/ui/kit";
import ProductsTable from "@/components/admin/products-table";
import type { Product } from "@/types/db";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const [{ data }, { data: soldRows }] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    // Terjual per buku = order PAID yang memuat produk (dihitung live, selalu akurat).
    supabase
      .from("order_items")
      .select("product_id, price_snapshot, orders!inner(status)")
      .eq("orders.status", "PAID")
      .not("product_id", "is", null),
  ]);

  const sold = new Map<string, { n: number; revenue: number }>();
  for (const r of (soldRows ?? []) as { product_id: string | null; price_snapshot: number }[]) {
    if (!r.product_id) continue;
    const cur = sold.get(r.product_id) ?? { n: 0, revenue: 0 };
    cur.n += 1;
    cur.revenue += r.price_snapshot ?? 0;
    sold.set(r.product_id, cur);
  }

  return (
    <AppShell mode="admin">
      <PageHeader
        title="Products"
        desc="Search, filter pilar & status, create, edit, archive."
        action={<Btn href="/admin/products/new">+ New</Btn>}
      />
      <ProductsTable
        data={(data ?? []) as Product[]}
        sold={[...sold.entries()].map(([id, v]) => ({ id, ...v }))}
      />
    </AppShell>
  );
}

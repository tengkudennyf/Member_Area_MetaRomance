import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Card, PageHeader } from "@/components/ui/kit";
import CoverImage from "@/components/ui/cover-image";
import ProductForm from "@/components/products/product-form";
import AssetUpload from "@/components/products/asset-upload";
import type { Product } from "@/types/db";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  if (!data) redirect("/admin/products");
  const product = data as Product;

  return (
    <AppShell mode="admin">
      <PageHeader title="Edit product" desc={product.slug} />
      <div className="space-y-4">
        <ProductForm existing={product} />
        <Card>
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">Content files</p>
          <div className="max-w-44 mb-3">
            <CoverImage bucket="product-covers" path={product.cover_path} title={product.title} ratio="aspect-[3/4]" />
          </div>
          <AssetUpload productId={product.id} />
          <p className="text-faint text-[12px] mt-3">
            Cover: {product.cover_path ?? "—"} · File: {product.file_path ?? "—"}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

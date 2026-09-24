import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui/kit";
import ProductForm from "@/components/products/product-form";

export default async function NewProductPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  return (
    <AppShell mode="admin">
      <PageHeader title="New product" desc="Basic info → pricing → access → publishing." />
      <ProductForm />
    </AppShell>
  );
}

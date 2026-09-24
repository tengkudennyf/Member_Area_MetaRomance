import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { Card, PageHeader } from "@/components/ui/kit";
import { PILLAR_LABEL } from "@/types/db";
import { rp } from "@/lib/utils/format";
import { getDictServer } from "@/lib/i18n/server";
import CheckoutForm from "@/components/orders/checkout-form";

export default async function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { user, profile, supabase } = await getSession();
  if (!user || !profile) redirect(`/login?next=/checkout/${productId}`);
  const { t } = await getDictServer();

  const { data: productRaw } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  const product = productRaw as unknown as {
    id: string;
    title: string;
    description: string;
    pillar: "5D_CONSCIOUSNESS" | "ROMANCE_ATTRACTION" | "FINANCIAL_CAREER" | "MANIFESTATION_TOOLS";
    product_type: string;
    price: number;
    original_price: number | null;
    status: string;
  } | null;
  const { data: eventRaw } = !product
    ? await supabase.from("events").select("*").eq("id", productId).single()
    : { data: null };
  const event = eventRaw as unknown as {
    id: string;
    title: string;
    description: string;
    price: number;
    original_price: number | null;
    status: string;
  } | null;

  if (!product && !event) redirect("/member/products");
  const isEvent = !product;
  const available = product
    ? product.status === "PUBLISHED"
    : ["PUBLISHED", "UPCOMING"].includes(event?.status ?? "");
  const title = product?.title ?? event?.title ?? "";
  const description = product?.description ?? event?.description ?? "";
  const price = product?.price ?? event?.price ?? 0;
  const originalPrice = product?.original_price ?? event?.original_price ?? null;

  return (
    <AppShell mode="member">
      <PageHeader title={t.checkout.title} desc={t.checkout.desc} />
      <Card className="mb-4">
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-1">
          {product ? PILLAR_LABEL[product.pillar] : "Event"} ·{" "}
          {isEvent ? "Event" : (product?.product_type ?? "")}
        </p>
        <h2 className="font-display text-[22px] mb-1">{title}</h2>
        <p className="text-faint text-[13px] mb-3 line-clamp-2">{description}</p>
        <p>
          {originalPrice ? (
            <span className="text-faint line-through text-[13px] mr-2">{rp(originalPrice)}</span>
          ) : null}
          <span className="font-display text-[22px] text-accent">{rp(price)}</span>
        </p>
        {!available && (
          <p className="text-danger text-[13px] mt-2">{t.checkoutMember.unavailable}</p>
        )}
      </Card>
      {available && (
        <Card>
          <CheckoutForm
            productId={product?.id}
            eventId={event?.id}
            userName={profile.name}
            userEmail={profile.email}
          />
        </Card>
      )}
    </AppShell>
  );
}



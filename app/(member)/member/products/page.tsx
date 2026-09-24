import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { Card, Empty, PageHeader } from "@/components/ui/kit";
import { PILLAR_LABEL, type Pillar, type Product } from "@/types/db";
import { rp } from "@/lib/utils/format";
import { getDictServer } from "@/lib/i18n/server";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string }>;
}) {
  const { user, profile } = await getSession();
  if (!user || !profile) redirect("/login?next=/member/products");
  const { pillar } = await searchParams;

  const supabase = (await import("@/lib/supabase/server")).createClient;
  const db = await supabase();
  const { data: access } = await db
    .from("product_access")
    .select("product_id")
    .eq("user_id", profile.id)
    .eq("status", "ACTIVE");
  const owned = new Set((access ?? []).map((a: { product_id: string }) => a.product_id));

  let query = db.from("products").select("*").eq("status", "PUBLISHED").order("created_at");
  if (pillar && pillar !== "All") query = query.eq("pillar", pillar);
  const { data } = await query;
  const list = ((data ?? []) as Product[]).filter((p) => owned.has(p.id));
  const { t } = await getDictServer();

  return (
    <AppShell mode="member">
      <PageHeader title={t.library.title} desc={t.library.desc} />
      <div className="mb-5 flex gap-2 flex-wrap">
        {[
          "All",
          "5D_CONSCIOUSNESS",
          "ROMANCE_ATTRACTION",
          "FINANCIAL_CAREER",
          "MANIFESTATION_TOOLS",
        ].map((p) => (
          <Link
            key={p}
            href={p === "All" ? "/member/products" : `/member/products?pillar=${p}`}
            className={`text-[12px] px-4 py-2 rounded-[10px] border transition ${
              (pillar ?? "All") === p
                ? "bg-accent text-on-accent border-accent font-semibold"
                : "border-border text-faint hover:text-foreground"
            }`}
          >
            {p === "All" ? t.library.all : PILLAR_LABEL[p as Pillar].split(" ")[0]}
          </Link>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty
          title={t.library.emptyTitle}
          desc={t.library.emptyDesc}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {list.map((p) => (
            <Link key={p.id} href={`/member/products/${p.slug}`}>
              <Card className="lift h-full">
                <div className="aspect-[4/3] rounded-xl bg-background border border-border flex items-center justify-center mb-3">
                  <span className="font-display text-[24px] text-accent/70">✦</span>
                </div>
                <p className="text-accent text-[10px] tracking-[0.14em] uppercase">
                  {PILLAR_LABEL[p.pillar]}
                </p>
                <p className="text-[13px] font-medium leading-snug mt-1 line-clamp-2 min-h-9">
                  {p.title}
                </p>
                <p className="text-faint text-[11px] mt-1">
                  {p.product_type} · {rp(p.price)} · {t.library.continue}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

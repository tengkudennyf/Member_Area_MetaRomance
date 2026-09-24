import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { Btn, Card, PageHeader } from "@/components/ui/kit";
import { getDictServer } from "@/lib/i18n/server";

export default async function MemberHome() {
  const { user, profile } = await getSession();
  if (!user || !profile) redirect("/login?next=/member");
  const supabase = (await import("@/lib/supabase/server")).createClient;
  const db = await supabase();

  const [{ count: products }, { count: waiting }, { data: access }] = await Promise.all([
    db
      .from("product_access")
      .select("id", { count: "exact" })
      .eq("user_id", profile.id)
      .eq("status", "ACTIVE"),
    db
      .from("orders")
      .select("id", { count: "exact" })
      .eq("user_id", profile.id)
      .in("status", ["PENDING_PAYMENT", "WAITING_VERIFICATION"]),
    db
      .from("product_access")
      .select("id, product_id, products(title, slug)")
      .eq("user_id", profile.id)
      .eq("status", "ACTIVE")
      .order("granted_at", { ascending: false })
      .limit(3),
  ]);

  const { data: regs } = await db
    .from("event_registrations")
    .select("id")
    .eq("user_id", profile.id)
    .eq("status", "REGISTERED");

  const { t } = await getDictServer();

  return (
    <AppShell mode="member">
      <PageHeader
        title={t.home.welcome.replace("{name}", profile.name.split(" ")[0] ?? "")}
        desc={t.home.desc}
      />
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { n: products ?? 0, l: t.home.yourProducts },
          { n: regs?.length ?? 0, l: t.home.yourEvents },
          { n: waiting ?? 0, l: t.home.pending },
        ].map((s) => (
          <Card key={s.l} className="text-center py-4">
            <p className="font-display text-[26px] text-accent">{s.n}</p>
            <p className="text-faint text-[11px] mt-1">{s.l}</p>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[20px]">{t.home.continueJourney}</h2>
        <Link href="/member/products" className="text-accent text-[13px] hover:underline">
          {t.home.viewAll}
        </Link>
      </div>
      {!access || access.length === 0 ? (
        <Card>
          <p className="text-faint text-[14px] mb-4">
            {t.home.empty}
          </p>
          <Btn href="/member/products">
            {t.home.exploreLibrary} <ArrowRight size={15} />
          </Btn>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(
            access as unknown as {
              product_id: string;
              products: { title: string; slug: string } | { title: string; slug: string }[] | null;
            }[]
          ).map((a) => {
            const p = Array.isArray(a.products) ? a.products[0] : a.products;
            if (!p) return null;
            return (
              <Link key={a.product_id} href={`/member/products/${p.slug}`}>
                <Card className="lift h-full">
                  <div className="aspect-[4/3] rounded-xl bg-background border border-border flex items-center justify-center mb-3">
                    <span className="font-display text-[22px] text-accent/70">✦</span>
                  </div>
                  <p className="text-[13px] font-medium leading-snug line-clamp-2">{p.title}</p>
                  <p className="text-accent text-[12px] mt-1">{t.home.continue}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

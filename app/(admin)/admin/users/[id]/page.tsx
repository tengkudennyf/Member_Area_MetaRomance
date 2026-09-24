import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Card, PageHeader } from "@/components/ui/kit";
import { ORDER_LABEL, fmtDateTime } from "@/lib/utils/format";
import { GrantAccessForm, RevokeButton } from "@/components/admin/user-access";
import type { Product, ProductAccess } from "@/types/db";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const svc = createServiceClient();
  const { data: user } = await svc.from("profiles").select("*").eq("id", id).single();
  if (!user) redirect("/admin/users");
  const [accessRes, ordersRes, regsRes, productsRes] = await Promise.all([
    svc
      .from("product_access")
      .select("id, status, granted_at, source, product_id")
      .eq("user_id", id),
    svc
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    svc.from("event_registrations").select("id, status, event_id").eq("user_id", id),
    svc.from("products").select("id, title").eq("status", "PUBLISHED").order("title"),
  ]);
  const access = (accessRes.data ?? []) as (ProductAccess & { product_id: string })[];
  const pids = access.map((a) => a.product_id);
  const { data: owned } = pids.length
    ? await svc.from("products").select("id, title, slug").in("id", pids)
    : { data: [] };
  const titleOf = (pid: string) =>
    ((owned ?? []) as { id: string; title: string; slug: string }[]).find((p) => p.id === pid);
  const { data: events } = await svc
    .from("events")
    .select("id, title")
    .in(
      "id",
      ((regsRes.data ?? []) as { event_id: string }[]).map((r) => r.event_id).filter(Boolean)
    );
  const eventTitle = (eid: string) =>
    ((events ?? []) as { id: string; title: string }[]).find((e) => e.id === eid)?.title ?? eid;

  return (
    <AppShell mode="admin">
      <PageHeader
        title={(user as { name: string }).name}
        desc={`${(user as { email: string }).email} · ${(user as { phone: string }).phone}`}
      />
      <h3 className="font-display text-[17px] mb-2">Product ownership ({access.length})</h3>
      <div className="space-y-2 mb-6">
        {access.length === 0 && <p className="text-faint text-[13px]">Belum ada akses.</p>}
        {access.map((a) => {
          const p = titleOf(a.product_id);
          return (
            <Card key={a.id} className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-44">
                {p ? (
                  <Link
                    href={`/member/products/${p.slug}`}
                    className="text-[13px] hover:text-accent"
                  >
                    {p.title}
                  </Link>
                ) : (
                  <p className="text-[13px]">{a.product_id}</p>
                )}
                <p className="text-faint text-[11px]">
                  {a.status} · {a.source} · {fmtDateTime(a.granted_at)}
                </p>
              </div>
              {a.status === "ACTIVE" && <RevokeButton accessId={a.id} />}
            </Card>
          );
        })}
      </div>

      <h3 className="font-display text-[17px] mb-2">Grant access</h3>
      <Card className="mb-6">
        <GrantAccessForm userId={id} products={(productsRes.data ?? []) as Product[]} />
      </Card>

      <h3 className="font-display text-[17px] mb-2">
        Event registrations ({((regsRes.data ?? []) as unknown[]).length})
      </h3>
      <div className="space-y-2 mb-6">
        {((regsRes.data ?? []) as { id: string; status: string; event_id: string }[]).map((r) => (
          <Card key={r.id} className="flex justify-between text-[13px]">
            <span>{eventTitle(r.event_id)}</span>
            <span className="text-faint">{r.status}</span>
          </Card>
        ))}
        {(regsRes.data ?? []).length === 0 && <p className="text-faint text-[13px]">Belum ada.</p>}
      </div>

      <h3 className="font-display text-[17px] mb-2">Order history</h3>
      <div className="space-y-2">
        {(
          (ordersRes.data ?? []) as {
            id: string;
            order_number: string;
            status: string;
            total: number;
          }[]
        ).map((o) => (
          <Card key={o.id} className="flex justify-between text-[13px]">
            <Link href={`/admin/orders/${o.id}`} className="text-accent hover:underline">
              {o.order_number}
            </Link>
            <span className="text-faint">{ORDER_LABEL[o.status] ?? o.status}</span>
          </Card>
        ))}
        {(ordersRes.data ?? []).length === 0 && (
          <p className="text-faint text-[13px]">Belum ada.</p>
        )}
      </div>
    </AppShell>
  );
}

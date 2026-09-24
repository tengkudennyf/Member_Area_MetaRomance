import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Card, PageHeader } from "@/components/ui/kit";
import { AddParticipant, CancelParticipant } from "@/components/events/participants";
import type { EventRegistration } from "@/types/db";

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const svc = createServiceClient();
  const { data: event } = await svc.from("events").select("id, title, quota").eq("id", id).single();
  if (!event) redirect("/admin/events");
  const { data: regs } = await svc
    .from("event_registrations")
    .select("id, status, registered_at, order_id, user_id")
    .eq("event_id", id)
    .order("registered_at", { ascending: false });
  const uids = (regs ?? []).map((r: { user_id: string }) => r.user_id);
  const { data: users } = uids.length
    ? await svc.from("profiles").select("id, name, email, phone").in("id", uids)
    : { data: [] };
  const { data: orders } = await svc
    .from("orders")
    .select("id, order_number, status")
    .in("id", (regs ?? []).map((r: { order_id: string }) => r.order_id).filter(Boolean));
  const userOf = (uid: string) =>
    ((users ?? []) as { id: string; name: string; email: string; phone: string }[]).find(
      (u) => u.id === uid
    );
  const orderOf = (oid: string | null) =>
    ((orders ?? []) as { id: string; order_number: string; status: string }[]).find(
      (o) => o.id === oid
    );

  return (
    <AppShell mode="admin">
      <PageHeader
        title="Participants"
        desc={`${(event as { title: string }).title} · ${(regs ?? []).length}/${(event as { quota: number | null }).quota ?? "∞"}`}
      />
      <Card className="mb-4">
        <AddParticipant eventId={id} />
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[620px]">
            <thead>
              <tr className="text-left text-faint text-[11px] uppercase tracking-[0.12em] border-b border-border">
                <th className="px-5 py-3.5 font-medium">Nama</th>
                <th className="px-5 py-3.5 font-medium">Email / WA</th>
                <th className="px-5 py-3.5 font-medium">Order</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {((regs ?? []) as (EventRegistration & { user_id: string })[]).map((r) => {
                const u = userOf(r.user_id);
                const o = orderOf(r.order_id);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5">{u?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-faint">
                      {u?.email} · {u?.phone}
                    </td>
                    <td className="px-5 py-3.5 text-faint">
                      {o ? `${o.order_number} (${o.status})` : "manual"}
                    </td>
                    <td className="px-5 py-3.5 text-faint">{r.status}</td>
                    <td className="px-5 py-3.5 text-right">
                      {r.status === "REGISTERED" && <CancelParticipant regId={r.id} eventId={id} />}
                    </td>
                  </tr>
                );
              })}
              {(regs ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-faint">
                    Belum ada peserta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

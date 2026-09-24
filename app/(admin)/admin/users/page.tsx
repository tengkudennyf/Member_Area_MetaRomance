import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Card, PageHeader } from "@/components/ui/kit";
import UsersTable from "@/components/admin/users-table";
import type { Profile } from "@/types/db";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ count: total }, { count: admins }, { count: active }, { count: fresh }, { data }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "ADMIN"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

  const stats = [
    { label: "Total user", value: total ?? 0 },
    { label: "Aktif", value: active ?? 0 },
    { label: "Baru 7 hari", value: fresh ?? 0 },
    { label: "Admin", value: admins ?? 0 },
  ];

  return (
    <AppShell mode="admin">
      <PageHeader title="Users" desc="Search, detail, ownership, grant/revoke." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {stats.map((s) => (
          <Card key={s.label} className="text-center py-4">
            <p className="font-display text-[28px] text-accent">{s.value}</p>
            <p className="text-faint text-[11px] uppercase tracking-[0.12em] mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <UsersTable data={(data ?? []) as Profile[]} />
    </AppShell>
  );
}

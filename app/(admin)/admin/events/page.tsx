import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Btn, PageHeader } from "@/components/ui/kit";
import { AdminEventsTable } from "@/components/admin/events-table";
import type { EventItem } from "@/types/db";

export default async function AdminEventsPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("start_at", { ascending: false });

  return (
    <AppShell mode="admin">
      <PageHeader
        title="Events"
        desc="Create, publish, cancel, kelola peserta & meeting URL."
        action={<Btn href="/admin/events/new">+ New</Btn>}
      />
      <AdminEventsTable data={(data ?? []) as EventItem[]} />
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Btn, PageHeader } from "@/components/ui/kit";
import EventForm from "@/components/events/event-form";
import type { EventItem } from "@/types/db";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const { data } = await supabase.from("events").select("*").eq("id", id).single();
  if (!data) redirect("/admin/events");

  return (
    <AppShell mode="admin">
      <PageHeader
        title="Edit event"
        action={
          <Btn variant="ghost" href={`/admin/events/${id}/participants`}>
            Participants →
          </Btn>
        }
      />
      <EventForm existing={data as EventItem} />
    </AppShell>
  );
}

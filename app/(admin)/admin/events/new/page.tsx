import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui/kit";
import EventForm from "@/components/events/event-form";

export default async function NewEventPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  return (
    <AppShell mode="admin">
      <PageHeader title="New event" desc="Draft → publish → upcoming." />
      <EventForm />
    </AppShell>
  );
}

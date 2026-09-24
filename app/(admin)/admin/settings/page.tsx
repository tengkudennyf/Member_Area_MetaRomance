import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import SettingsClient from "@/components/admin/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const { data } = await supabase.from("app_settings").select("key, value");
  const initial: Record<string, string | undefined> = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) {
    initial[row.key] = row.value;
  }
  return <SettingsClient initial={initial} />;
}

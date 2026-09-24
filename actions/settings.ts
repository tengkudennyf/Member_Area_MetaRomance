"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { settingsSchema } from "@/lib/validations/schemas";

export type ActionResult = { ok: boolean; error?: string };

// Settings key-value (§19): bank, instruksi, WA, email, main URL, event defaults.
export async function updateSettingsAction(
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  // bank_account dikirim form sebagai JSON string array
  // [{bank, number, name}] agar bisa multi-rekening.
  let banks: unknown = [];
  try {
    banks = JSON.parse(String(form.get("bank_account") ?? "[]"));
  } catch {
    banks = [];
  }
  const parsed = settingsSchema.safeParse({
    bank_account: banks,
    support_contact: form.get("support_contact"),
    payment_instruction: form.get("payment_instruction"),
    event_join_window: form.get("event_join_window"),
    download_policy: form.get("download_policy"),
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };

  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const t = new Date().toISOString();
  for (const [key, value] of Object.entries(parsed.data)) {
    const { error } = await svc
      .from("app_settings")
      .upsert({ key, value: JSON.stringify(value), updated_at: t }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/payment");
  return { ok: true };
}

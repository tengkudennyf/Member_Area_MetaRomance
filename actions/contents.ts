"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { SITE_CONTENT_LABELS } from "@/lib/cms/defaults";

export type ActionResult = { ok: boolean; error?: string };

// Simpan konten CMS dari dashboard. dataJson harus JSON object valid.
export async function upsertContentAction(
  key: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const label = String(form.get("label") || SITE_CONTENT_LABELS[key] || key);
  const status = String(form.get("status") || "PUBLISHED");
  const raw = String(form.get("data") || "{}");
  if (!["DRAFT", "PUBLISHED"].includes(status)) {
    return { ok: false, error: "Status tidak valid." };
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return { ok: false, error: "JSON harus berupa object {...}." };
    }
  } catch {
    return { ok: false, error: "JSON tidak valid. Cek koma/kutip." };
  }

  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const { error } = await svc.from("site_contents").upsert(
    {
      key,
      label,
      data,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/contents");
  revalidatePath("/api/public/site");
  redirect("/admin/contents");
}

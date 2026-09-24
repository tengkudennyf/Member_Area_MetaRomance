"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { eventSchema } from "@/lib/validations/schemas";
import { notifyUser, notifyEmailFailure, sendEmail } from "@/lib/email/send";
import { tpl } from "@/emails/templates";

export type ActionResult = { ok: boolean; error?: string };

const MAX_COVER = 5 * 1024 * 1024;

function parseEvent(form: FormData) {
  return eventSchema.safeParse({
    title: form.get("title"),
    slug: form.get("slug"),
    description: form.get("description"),
    pillar: form.get("pillar"),
    event_type: form.get("event_type"),
    platform: form.get("platform"),
    meeting_url: form.get("meeting_url") || "",
    start_at: form.get("start_at"),
    end_at: form.get("end_at"),
    price: form.get("price"),
    quota: form.get("quota") || null,
    status: form.get("status"),
  });
}

function toPayload(parsed: ReturnType<typeof parseEvent> & { success: true }) {
  const d = parsed.data;
  return {
    title: d.title,
    slug: d.slug,
    description: d.description,
    pillar: d.pillar,
    event_type: d.event_type,
    platform: d.platform,
    meeting_url: d.meeting_url || null,
    start_at: new Date(d.start_at).toISOString(),
    end_at: new Date(d.end_at).toISOString(),
    price: d.price,
    quota: d.quota ?? null,
    status: d.status,
  };
}

export async function createEventAction(
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const parsed = parseEvent(form);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  if (new Date(parsed.data.end_at) <= new Date(parsed.data.start_at))
    return { ok: false, error: "Waktu selesai harus setelah mulai" };
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const cover = form.get("cover") as File | null;
  let cover_path: string | null = null;
  if (cover && cover.size > 0) {
    if (cover.size > MAX_COVER) return { ok: false, error: "Cover maksimal 5MB." };
    if (!cover.type.startsWith("image/")) return { ok: false, error: "Cover harus gambar." };
    cover_path = `event-covers/${parsed.data.slug}/${Date.now()}-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await svc.storage
      .from("event-covers")
      .upload(cover_path, cover, { contentType: cover.type });
    if (error) return { ok: false, error: error.message };
  }
  const { error } = await svc.from("events").insert({ ...toPayload(parsed), cover_path });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/events");
  revalidatePath("/member/events");
  redirect("/admin/events");
}

export async function updateEventAction(
  id: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const parsed = parseEvent(form);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  if (new Date(parsed.data.end_at) <= new Date(parsed.data.start_at))
    return { ok: false, error: "Waktu selesai harus setelah mulai" };
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const cover = form.get("cover") as File | null;
  let cover_path: string | undefined;
  if (cover && cover.size > 0) {
    if (cover.size > MAX_COVER) return { ok: false, error: "Cover maksimal 5MB." };
    if (!cover.type.startsWith("image/")) return { ok: false, error: "Cover harus gambar." };
    cover_path = `event-covers/${parsed.data.slug}/${Date.now()}-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await svc.storage
      .from("event-covers")
      .upload(cover_path, cover, { contentType: cover.type });
    if (error) return { ok: false, error: error.message };
  }
  const { error } = await svc
    .from("events")
    .update({
      ...toPayload(parsed),
      ...(cover_path ? { cover_path } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/events");
  revalidatePath("/member/events");
  redirect("/admin/events");
}

export async function cancelEventAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const { error } = await svc.from("events").update({ status: "CANCELLED" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/events");
  return { ok: true };
}

// Manual add participant (§4 Admin Participants) — tanpa order (source ADMIN).
export async function addParticipantAction(
  eventId: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Email tidak valid" };
  const supabase = await createClient();
  let admin;
  try {
    ({ profile: admin } = await requireAdmin(supabase));
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  void admin;
  const svc = createServiceClient();
  const { data: target } = await svc
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .single();
  if (!target) return { ok: false, error: "User dengan email itu belum register." };
  const { data: event } = await svc
    .from("events")
    .select("id, title, slug, quota")
    .eq("id", eventId)
    .single();
  if (!event) return { ok: false, error: "Event tidak ditemukan" };
  if (event.quota != null) {
    const { count } = await svc
      .from("event_registrations")
      .select("id", { count: "exact" })
      .eq("event_id", eventId)
      .eq("status", "REGISTERED");
    if ((count ?? 0) >= (event.quota as number)) return { ok: false, error: "Kuota penuh" };
  }
  const { error } = await svc.from("event_registrations").upsert(
    {
      event_id: eventId,
      user_id: (target as { id: string }).id,
      order_id: null,
      status: "REGISTERED",
    },
    { onConflict: "event_id,user_id" }
  );
  if (error) return { ok: false, error: error.message };
  await notifyUser(svc, {
    user_id: (target as { id: string }).id,
    type: "event_confirmed",
    title: "Terdaftar di event",
    message: `Admin mendaftarkan Anda ke "${(event as { title: string }).title}".`,
    href: `/member/events/${(event as { slug: string }).slug}`,
  });
  const e = tpl.eventConfirmed(
    (event as { title: string }).title,
    `${process.env.NEXT_PUBLIC_APP_URL}/member/events/${(event as { slug: string }).slug}`
  );
  const mail = await sendEmail({ to: (target as { email: string }).email, subject: e.subject, html: e.html });
  if (mail.error)
    await notifyEmailFailure(svc, {
      user_id: (target as { id: string }).id,
      subject: e.subject,
      error: mail.error,
    });
  revalidatePath(`/admin/events/${eventId}/participants`);
  return { ok: true };
}

export async function cancelParticipantAction(
  regId: string,
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const { error } = await svc
    .from("event_registrations")
    .update({ status: "CANCELLED" })
    .eq("id", regId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/events/${eventId}/participants`);
  return { ok: true };
}

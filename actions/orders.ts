"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin, requireUser } from "@/lib/permissions/guard";
import { checkoutSchema, verifySchema } from "@/lib/validations/schemas";
import { orderNumber } from "@/lib/utils/format";
import { notifyUser, notifyEmailFailure, sendEmail } from "@/lib/email/send";
import { isValidProofFile } from "@/lib/files/magic";
import { getActionDict } from "@/lib/i18n/server";
import { tpl } from "@/emails/templates";

export type ActionResult = { ok: boolean; error?: string };

// Admin: tautkan order TAMU ke akun member (mis. typo email saat checkout).
// Hanya order PAID tanpa pemilik. Idempotent — akses yang sudah ada dilewati.
export async function linkOrderToUserAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const orderId = String(form.get("orderId") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!orderId || !email.includes("@")) return { ok: false, error: "Order + email wajib." };

  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();

  const { data: orderRaw } = await svc.from("orders").select("*").eq("id", orderId).single();
  const order = orderRaw as unknown as {
    id: string; order_number: string; user_id: string | null; status: string;
  } | null;
  if (!order) return { ok: false, error: "Order tidak ditemukan" };
  if (order.status !== "PAID") return { ok: false, error: "Hanya order PAID yang bisa ditautkan" };
  if (order.user_id) return { ok: false, error: "Order sudah punya pemilik" };

  const { data: profRaw } = await svc.from("profiles").select("id, email").ilike("email", email).single();
  const target = profRaw as { id: string; email: string } | null;
  if (!target) return { ok: false, error: "Email belum terdaftar sebagai member" };

  const { data: items } = await svc.from("order_items").select("*").eq("order_id", order.id);
  for (const it of (items ?? []) as {
    product_id: string | null; event_id: string | null; item_type: string;
  }[]) {
    if (it.item_type === "PRODUCT" && it.product_id) {
      const { data: existing } = await svc
        .from("product_access")
        .select("id")
        .eq("user_id", target.id)
        .eq("product_id", it.product_id)
        .eq("status", "ACTIVE")
        .limit(1);
      if (!existing || existing.length === 0) {
        await svc.from("product_access").insert({
          user_id: target.id, product_id: it.product_id,
          order_id: order.id, source: "PURCHASE", status: "ACTIVE",
        });
      }
    } else if (it.item_type === "EVENT" && it.event_id) {
      const { data: existing } = await svc
        .from("event_registrations")
        .select("id")
        .eq("event_id", it.event_id)
        .eq("user_id", target.id)
        .eq("status", "REGISTERED")
        .limit(1);
      if (!existing || existing.length === 0) {
        await svc.from("event_registrations").insert({
          event_id: it.event_id, user_id: target.id, order_id: order.id, status: "REGISTERED",
        });
      }
    }
  }
  await svc.from("orders").update({ user_id: target.id }).eq("id", order.id);

  const { notifyUser } = await import("@/lib/email/send");
  await notifyUser(svc, {
    user_id: target.id,
    type: "guest_claimed",
    title: "Pembelian ditautkan oleh admin",
    message: `Order ${order.order_number} kini ada di akun Anda.`,
    href: "/member/products",
  });

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/member/products");
  return { ok: true };
}

const MAX_PROOF = 5 * 1024 * 1024; // bukti ≤5MB

// Checkout: order + item snapshot + payment row. Snapshot agar histori
// tidak berubah bila produk diedit (§13).
export async function checkoutAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const d = await getActionDict();
  const parsed = checkoutSchema.safeParse({
    productId: form.get("productId") || undefined,
    eventId: form.get("eventId") || undefined,
    notes: form.get("notes") || undefined,
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? d.errors.invalidInput };

  const supabase = await createClient();
  let profile;
  try {
    ({ profile } = await requireUser(supabase));
  } catch {
    return { ok: false, error: "UNAUTHORIZED" };
  }
  const svc = createServiceClient();

  let title = "";
  let price = 0;
  let itemType: "PRODUCT" | "EVENT" = "PRODUCT";
  if (parsed.data.productId) {
    const { data: p } = await svc
      .from("products")
      .select("id, title, price, status")
      .eq("id", parsed.data.productId)
      .single();
    if (!p || p.status !== "PUBLISHED") return { ok: false, error: d.errors.productUnavailable };
    // Cegah beli ulang produk ACTIVE
    const { data: owned } = await svc
      .from("product_access")
      .select("id")
      .eq("user_id", profile.id)
      .eq("product_id", p.id)
      .eq("status", "ACTIVE")
      .limit(1);
    if (owned && owned.length > 0) return { ok: false, error: d.errors.alreadyOwned };
    title = p.title;
    price = p.price;
  } else {
    const { data: e } = await svc
      .from("events")
      .select("id, title, price, status, quota")
      .eq("id", parsed.data.eventId)
      .single();
    if (!e || !["PUBLISHED", "UPCOMING"].includes(e.status))
      return { ok: false, error: d.errors.eventUnavailable };
    const { data: reg } = await svc
      .from("event_registrations")
      .select("id")
      .eq("event_id", e.id)
      .eq("user_id", profile.id)
      .eq("status", "REGISTERED")
      .limit(1);
    if (reg && reg.length > 0) return { ok: false, error: d.errors.alreadyRegistered };
    if (e.quota != null) {
      const { count } = await svc
        .from("event_registrations")
        .select("id", { count: "exact" })
        .eq("event_id", e.id)
        .eq("status", "REGISTERED");
      if ((count ?? 0) >= e.quota) return { ok: false, error: d.errors.quotaFull };
    }
    title = e.title;
    price = e.price;
    itemType = "EVENT";
  }

  // Order number unik — retry 3x bila tabrakan.
  // S2: dedupe_key + partial unique index — race checkout ganda menghasilkan
  // 23505 → tolak ramah (bukan 500). Sama seperti app-level owned-check di atas.
  const itemId = parsed.data.productId ?? parsed.data.eventId ?? "";
  const dedupeKey = `u:${profile.id}|${itemType === "PRODUCT" ? "product" : "event"}:${itemId}`;
  let orderId = "";
  for (let i = 0; i < 3; i += 1) {
    const { data, error } = await svc
      .from("orders")
      .insert({
        order_number: orderNumber(),
        user_id: profile.id,
        subtotal: price,
        discount: 0,
        total: price,
        status: "PENDING_PAYMENT",
        notes: parsed.data.notes ?? null,
        dedupe_key: dedupeKey,
      })
      .select("id")
      .single();
    if (!error && data) {
      orderId = data.id as string;
      break;
    }
    if ((error as { code?: string } | null)?.code === "23505") {
      const { data: existing } = await svc
        .from("orders")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .in("status", ["PENDING_PAYMENT", "WAITING_VERIFICATION", "PAID"])
        .maybeSingle();
      if (existing) return { ok: false, error: d.errors.alreadyOrdered };
    }
  }
  if (!orderId) return { ok: false, error: d.errors.orderFailed };

  await svc.from("order_items").insert({
    order_id: orderId,
    product_id: itemType === "PRODUCT" ? parsed.data.productId : null,
    event_id: itemType === "EVENT" ? parsed.data.eventId : null,
    item_type: itemType,
    title_snapshot: title,
    price_snapshot: price,
  });
  await svc
    .from("payments")
    .insert({ order_id: orderId, payment_method: "BANK_TRANSFER", status: "PENDING" });

  revalidatePath("/member/orders");
  redirect(`/payment/${orderId}`);
}

// Upload bukti → WAITING_VERIFICATION. Storage privat payment-proofs.
export async function uploadProofAction(
  orderId: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const d = await getActionDict();
  const file = form.get("proof") as File | null;
  if (!file || file.size === 0) return { ok: false, error: d.errors.pickProof };
  if (file.size > MAX_PROOF) return { ok: false, error: d.errors.fileMax5 };
  const okType =
    ["image/jpeg", "image/png", "application/pdf"].includes(file.type) ||
    /\.(jpe?g|png|pdf)$/i.test(file.name);
  if (!okType) return { ok: false, error: d.errors.badFormat };
  // S6: MIME + ekstensi bisa dipalsukan — verifikasi isi biner asli.
  if (!(await isValidProofFile(file)))
    return { ok: false, error: d.errors.badContent };

  const supabase = await createClient();
  let profile;
  try {
    ({ profile } = await requireUser(supabase));
  } catch {
    return { ok: false, error: "UNAUTHORIZED" };
  }
  const svc = createServiceClient();
  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, user_id, status")
    .eq("id", orderId)
    .single();
  if (!order || order.user_id !== profile.id) return { ok: false, error: "FORBIDDEN" };
  if (!["PENDING_PAYMENT", "REJECTED"].includes(order.status))
    return { ok: false, error: d.errors.orderProcessed };

  const path = `proofs/${orderId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: upErr } = await svc.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type });
  if (upErr) return { ok: false, error: upErr.message };

  const t = new Date().toISOString();
  await svc
    .from("payments")
    .update({ proof_path: path, status: "SUBMITTED", submitted_at: t, updated_at: t })
    .eq("order_id", orderId);
  await svc
    .from("orders")
    .update({ status: "WAITING_VERIFICATION", updated_at: t })
    .eq("id", orderId);

  await notifyUser(svc, {
    user_id: profile.id,
    type: "payment_submitted",
    title: "Bukti pembayaran diterima",
    message: `Order ${order.order_number} menunggu verifikasi admin.`,
    href: `/member/orders/${orderId}`,
  });
  const e = tpl.paymentSubmitted(order.order_number as string);
  const mail = await sendEmail({ to: profile.email, subject: e.subject, html: e.html });
  if (mail.error)
    await notifyEmailFailure(svc, { user_id: profile.id, subject: e.subject, error: mail.error });

  revalidatePath(`/member/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

// Verifikasi admin — idempotent: upsert guard via unique constraint,
// cek existing sebelum insert agar klik ganda tidak duplikat akses.
export async function verifyAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = verifySchema.safeParse({
    orderId: form.get("orderId"),
    verdict: form.get("verdict"),
    rejection_reason: form.get("rejection_reason") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Input tidak valid" };

  const supabase = await createClient();
  let admin;
  try {
    ({ profile: admin } = await requireAdmin(supabase));
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const t = new Date().toISOString();

  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, user_id, guest_email, status")
    .eq("id", parsed.data.orderId)
    .single();
  if (!order) return { ok: false, error: "Order tidak ditemukan" };
  // Spesial case: APPROVE boleh dari PENDING_PAYMENT (tanpa bukti — user
  // konfirmasi manual via WhatsApp) maupun WAITING_VERIFICATION.
  // REJECT butuh bukti untuk dinilai → hanya dari WAITING_VERIFICATION.
  const canApprove = order.status === "WAITING_VERIFICATION" || order.status === "PENDING_PAYMENT";
  if (parsed.data.verdict === "REJECTED") {
    if (order.status !== "WAITING_VERIFICATION")
      return { ok: false, error: `Order ${order.status} — reject butuh bukti terupload` };
  } else if (!canApprove) {
    return { ok: false, error: `Order sudah ${order.status}` };
  }
  const orderUserId = order.user_id as string | null;
  const guestEmail = order.guest_email as string | null;

  if (parsed.data.verdict === "REJECTED") {
    await svc.from("orders").update({ status: "REJECTED", updated_at: t }).eq("id", order.id);
    await svc
      .from("payments")
      .update({
        status: "REJECTED",
        verified_at: t,
        verified_by: admin.id,
        rejection_reason: parsed.data.rejection_reason ?? null,
        updated_at: t,
      })
      .eq("order_id", order.id);
    if (orderUserId) {
      await notifyUser(svc, {
        user_id: orderUserId,
        type: "payment_rejected",
        title: "Pembayaran perlu perhatian",
        message: `Order ${order.order_number}: ${parsed.data.rejection_reason ?? "bukti tidak valid"}.`,
        href: `/member/orders/${order.id}`,
      });
    }
    const { data: target } = orderUserId
      ? await svc.from("profiles").select("email").eq("id", orderUserId).single()
      : { data: null };
    const rejectEmail =
      (target as { email: string } | null)?.email ?? guestEmail ?? null;
    if (rejectEmail) {
      const e = tpl.paymentRejected(
        order.order_number as string,
        parsed.data.rejection_reason ?? ""
      );
      const mail = await sendEmail({ to: rejectEmail, subject: e.subject, html: e.html });
      if (mail.error && orderUserId)
        await notifyEmailFailure(svc, { user_id: orderUserId, subject: e.subject, error: mail.error });
    }
    revalidatePath(`/admin/orders/${order.id}`);
    return { ok: true };
  }

  // APPROVED: order PAID → akses + registrasi + notif + email
  const { data: items } = await svc.from("order_items").select("*").eq("order_id", order.id);

  // S1: klaim kursi event ATOMIK (RPC, lock+count+insert) SEBELUM menandai PAID.
  // Mencegah overbook bila dua admin approve bersamaan / checkout interleaved.
  // FULL → batalkan approve (tidak ada yang tertulis); DUP → idempoten, lanjut.
  if (orderUserId) {
    for (const it of (items ?? []) as { item_type: string; event_id: string | null }[]) {
      if (it.item_type !== "EVENT" || !it.event_id) continue;
      const { data: slot, error: slotErr } = await svc.rpc("register_event_slot", {
        p_event_id: it.event_id,
        p_user_id: orderUserId,
        p_order_id: order.id,
      });
      if (slotErr) return { ok: false, error: `Gagal klaim kursi event: ${slotErr.message}` };
      if (slot === "FULL")
        return { ok: false, error: "Kuota event penuh — approve dibatalkan. Tolak order ini bila perlu." };
      if (slot !== "OK" && slot !== "DUP")
        return { ok: false, error: `Klaim kursi event gagal (${slot ?? "unknown"}).` };
    }
  }

  await svc.from("orders").update({ status: "PAID", updated_at: t }).eq("id", order.id);
  await svc
    .from("payments")
    .update({
      status: "APPROVED",
      verified_at: t,
      verified_by: admin.id,
      updated_at: t,
    })
    .eq("order_id", order.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const { data: target } = orderUserId
    ? await svc.from("profiles").select("email, name").eq("id", orderUserId).single()
    : { data: null };
  const recipientEmail =
    (target as { email: string } | null)?.email ?? guestEmail ?? null;

  for (const it of items ?? []) {
    const item = it as {
      product_id: string | null;
      event_id: string | null;
      item_type: string;
      title_snapshot: string;
    };
    if (item.item_type === "PRODUCT" && item.product_id) {
      if (orderUserId) {
        const { data: existing } = await svc
          .from("product_access")
          .select("id")
          .eq("user_id", orderUserId)
          .eq("product_id", item.product_id)
          .eq("status", "ACTIVE")
          .limit(1);
        if (!existing || existing.length === 0) {
          const { error: grantErr } = await svc.from("product_access").insert({
            user_id: orderUserId,
            product_id: item.product_id,
            order_id: order.id,
            source: "PURCHASE",
            status: "ACTIVE",
            granted_by: admin.id,
          });
          // S2: unique idx_access_user_product_active — race concurrent approve
          // → anggap sudah granted (idempoten), bukan error.
          if (grantErr && (grantErr as { code?: string }).code !== "23505")
            return { ok: false, error: `Gagal grant akses: ${grantErr.message}` };
        }
      }
      const { data: p } = await svc
        .from("products")
        .select("slug")
        .eq("id", item.product_id)
        .single();
      const prod = p as { slug: string } | null;
      if (orderUserId) {
        await notifyUser(svc, {
          user_id: orderUserId,
          type: "access_granted",
          title: "Pembayaran disetujui",
          message: `"${item.title_snapshot}" kini ada di Library Anda.`,
          href: prod ? `/member/products/${prod.slug}` : "/member/products",
        });
      }
      if (recipientEmail && prod) {
        // Tamu (tanpa akun): email berisi LINK CLAIM → member area
        // (login/daftar) → pembelian otomatis masuk Library.
        const claimUrl = `${appUrl}/claim?o=${encodeURIComponent(order.order_number as string)}&e=${encodeURIComponent(recipientEmail)}`;
        const e = orderUserId
          ? tpl.paymentApproved(order.order_number as string, `${appUrl}/member/products`)
          : tpl.guestPaymentApproved(order.order_number as string, claimUrl, [item.title_snapshot]);
        const mail = await sendEmail({ to: recipientEmail, subject: e.subject, html: e.html });
        if (mail.error && orderUserId)
          await notifyEmailFailure(svc, { user_id: orderUserId, subject: e.subject, error: mail.error });
      }
    } else if (item.item_type === "EVENT" && item.event_id) {
      // S1: registrasi sudah diklaim atomik via register_event_slot SEBELUM PAID
      // di atas — di sini tinggal notifikasi + email (tanpa insert lagi).
      const { data: ev } = await svc.from("events").select("slug").eq("id", item.event_id).single();
      if (orderUserId) {
        await notifyUser(svc, {
          user_id: orderUserId,
          type: "event_confirmed",
          title: "Pendaftaran event dikonfirmasi",
          message: `"${item.title_snapshot}" — cek jadwal & Join.`,
          href: ev ? `/member/events/${(ev as { slug: string }).slug}` : "/member/events",
        });
      }
      if (recipientEmail && ev) {
        const claimUrl = `${appUrl}/claim?o=${encodeURIComponent(order.order_number as string)}&e=${encodeURIComponent(recipientEmail)}`;
        const e = orderUserId
          ? tpl.eventConfirmed(item.title_snapshot, `${appUrl}/member/events`)
          : tpl.guestEventApproved(order.order_number as string, item.title_snapshot, claimUrl);
        const mail = await sendEmail({ to: recipientEmail, subject: e.subject, html: e.html });
        if (mail.error && orderUserId)
          await notifyEmailFailure(svc, { user_id: orderUserId, subject: e.subject, error: mail.error });
      }
    }
  }

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/member/products");
  revalidatePath("/member/events");
  return { ok: true };
}

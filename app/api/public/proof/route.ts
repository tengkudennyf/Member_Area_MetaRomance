import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isDemoMode } from "@/lib/supabase/env";
import { cors, preflight, denyDisallowedOrigin, isEmail } from "@/lib/api/cors";
import { rateLimit, withRateHeaders } from "@/lib/api/rate-limit";
import { isValidProofFile } from "@/lib/files/magic";

// Upload bukti transfer dari website (tanpa login).
// POST multipart /api/public/proof { order_number, email, proof: File(jpg/png/pdf ≤5MB) }
// → order WAITING_VERIFICATION. Admin verifikasi manual di /admin/orders.
// S17: guest orders (user_id NULL) tak ter-cover policy RLS "orders own" —
// by design hanya service role (API ini) yang boleh baca/tulis.

const MAX_PROOF = 5 * 1024 * 1024;

export async function OPTIONS(req: Request): Promise<NextResponse> {
  return preflight(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = denyDisallowedOrigin(req);
  if (denied) return denied;
  const limited = await rateLimit(req, "proofUpload");
  if (limited) return cors(limited, req);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return cors(NextResponse.json({ error: "Kirim sebagai multipart form." }, { status: 400 }), req);
  }
  const orderNo = String(form.get("order_number") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const file = form.get("proof") as File | null;
  if (!orderNo || !isEmail(email))
    return cors(NextResponse.json({ error: "order_number + email wajib." }, { status: 400 }), req);
  if (!file || file.size === 0)
    return cors(NextResponse.json({ error: "Pilih file bukti dulu." }, { status: 400 }), req);
  if (file.size > MAX_PROOF)
    return cors(NextResponse.json({ error: "File maksimal 5MB." }, { status: 400 }), req);
  const okType =
    ["image/jpeg", "image/png", "application/pdf"].includes(file.type) ||
    /\.(jpe?g|png|pdf)$/i.test(file.name);
  if (!okType)
    return cors(NextResponse.json({ error: "Format: JPG, PNG, atau PDF." }, { status: 400 }), req);
  // S6: MIME + ekstensi bisa dipalsukan — verifikasi isi biner asli.
  if (!(await isValidProofFile(file)))
    return cors(NextResponse.json({ error: "Isi file tidak valid (bukan JPG/PNG/PDF asli)." }, { status: 400 }), req);
  if (isDemoMode())
    return cors(NextResponse.json({ error: "Mode demo." }, { status: 503 }), req);

  const svc = createServiceClient();
  const { data: orderRaw } = await svc
    .from("orders")
    .select("id, order_number, status, guest_email, user_id")
    .eq("order_number", orderNo)
    .maybeSingle();
  const order = orderRaw as unknown as {
    id: string;
    order_number: string;
    status: string;
    guest_email: string | null;
    user_id: string | null;
  } | null;
  if (!order) return cors(NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 }), req);

  let allowed = order.guest_email?.toLowerCase() === email;
  if (!allowed && order.user_id) {
    const { data: prof } = await svc.from("profiles").select("email").eq("id", order.user_id).single();
    allowed = (prof as { email: string } | null)?.email?.toLowerCase() === email;
  }
  if (!allowed) return cors(NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 }), req);
  if (!["PENDING_PAYMENT", "REJECTED"].includes(order.status))
    return cors(NextResponse.json({ error: "Order sudah diproses." }, { status: 409 }), req);

  const path = `proofs/${order.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: upErr } = await svc.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (upErr) return cors(NextResponse.json({ error: upErr.message }, { status: 500 }), req);

  const t = new Date().toISOString();
  await svc
    .from("payments")
    .update({ proof_path: path, status: "SUBMITTED", submitted_at: t, updated_at: t })
    .eq("order_id", order.id);
  await svc.from("orders").update({ status: "WAITING_VERIFICATION", updated_at: t }).eq("id", order.id);

  return withRateHeaders(
    cors(NextResponse.json({ ok: true, status: "WAITING_VERIFICATION" }), req),
    req,
    "proofUpload"
  );
}


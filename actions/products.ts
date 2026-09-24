"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/permissions/guard";
import { manualAccessSchema, productSchema } from "@/lib/validations/schemas";
import { notifyUser, notifyEmailFailure, sendEmail } from "@/lib/email/send";
import { isValidImageFile, isValidPdfFile } from "@/lib/files/magic";
import { tpl } from "@/emails/templates";

export type ActionResult = { ok: boolean; error?: string };

const MAX_FILE = 50 * 1024 * 1024; // PDF ≤50MB (§6)
const MAX_COVER = 5 * 1024 * 1024;

function parseProduct(form: FormData) {
  return productSchema.safeParse({
    title: form.get("title"),
    slug: form.get("slug"),
    description: form.get("description"),
    pillar: form.get("pillar"),
    product_type: form.get("product_type"),
    price: form.get("price"),
    original_price: form.get("original_price") || null,
    download_enabled: form.get("download_enabled") === "on",
    access_type: form.get("access_type"),
    status: form.get("status"),
  });
}

export async function createProductAction(
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const parsed = parseProduct(form);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const { error } = await svc.from("products").insert({
    ...parsed.data,
    original_price: parsed.data.original_price ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProductAction(
  id: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const parsed = parseProduct(form);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const { error } = await svc
    .from("products")
    .update({
      ...parsed.data,
      original_price: parsed.data.original_price ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  revalidatePath("/member/products");
  redirect("/admin/products");
}

export async function archiveProductAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const { error } = await svc.from("products").update({ status: "ARCHIVED" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}

// Upload cover (≤5MB, image) & file produk (PDF ≤50MB) — validasi server-side.
export async function uploadProductAsset(
  productId: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const kind = String(form.get("kind") || "file");
  const file = form.get("asset") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Pilih file dulu." };
  const svc = createServiceClient();

  if (kind === "cover") {
    if (file.size > MAX_COVER) return { ok: false, error: "Cover maksimal 5MB." };
    if (!file.type.startsWith("image/")) return { ok: false, error: "Cover harus gambar." };
    // S6: MIME bisa dipalsukan (termasuk SVG ber-script) — verifikasi biner asli.
    if (!(await isValidImageFile(file)))
      return { ok: false, error: "Cover harus gambar asli (JPG/PNG/GIF/WebP)." };
    const path = `covers/${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: upErr } = await svc.storage
      .from("product-covers")
      .upload(path, file, { contentType: file.type });
    if (upErr) return { ok: false, error: upErr.message };
    await svc.from("products").update({ cover_path: path }).eq("id", productId);
  } else {
    if (file.size > MAX_FILE) return { ok: false, error: "File maksimal 50MB." };
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
      return { ok: false, error: "File produk harus PDF." };
    // S6: MIME + ekstensi bisa dipalsukan — verifikasi biner PDF asli.
    if (!(await isValidPdfFile(file)))
      return { ok: false, error: "File produk harus PDF asli." };
    const path = `files/${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: upErr } = await svc.storage
      .from("product-files")
      .upload(path, file, { contentType: "application/pdf" });
    if (upErr) return { ok: false, error: upErr.message };
    await svc.from("products").update({ file_path: path }).eq("id", productId);
  }
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

// Manual admin grant (§37 story) + revoke.
export async function grantAccessAction(
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const parsed = manualAccessSchema.safeParse({
    userId: form.get("userId"),
    productId: form.get("productId"),
    reason: form.get("reason"),
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
  const { data: product } = await svc
    .from("products")
    .select("title, slug")
    .eq("id", parsed.data.productId)
    .single();
  const { error } = await svc.from("product_access").upsert(
    {
      user_id: parsed.data.userId,
      product_id: parsed.data.productId,
      order_id: null,
      source: "ADMIN",
      status: "ACTIVE",
      granted_by: admin.id,
    },
    { onConflict: "user_id,product_id,order_id" }
  );
  if (error) return { ok: false, error: error.message };
  const { data: target } = await svc
    .from("profiles")
    .select("email, name")
    .eq("id", parsed.data.userId)
    .single();
  if (target && product) {
    await notifyUser(svc, {
      user_id: parsed.data.userId,
      type: "access_granted",
      title: "Akses produk dibuka",
      message: `Admin membuka akses "${product.title}".`,
      href: `/member/products/${product.slug}`,
    });
    const t = tpl.accessGranted(
      product.title,
      `${process.env.NEXT_PUBLIC_APP_URL}/member/products/${product.slug}`
    );
    const mail = await sendEmail({ to: target.email, subject: t.subject, html: t.html });
    if (mail.error)
      await notifyEmailFailure(svc, { user_id: parsed.data.userId, subject: t.subject, error: mail.error });
  }
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { ok: true };
}

export async function revokeAccessAction(accessId: string): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }
  const svc = createServiceClient();
  const { error } = await svc
    .from("product_access")
    .update({ status: "REVOKED" })
    .eq("id", accessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

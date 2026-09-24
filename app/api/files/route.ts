import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// §20 flow: cek product_access server-side → signed URL 15 menit.
// Tanpa akses → 403. Tanpa file → 404. Public tidak bisa tebak URL.
// ?download=1 → paksa download (Content-Disposition attachment), default inline (baca di browser).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId wajib" }, { status: 400 });
  const forceDownload = searchParams.get("download") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const svc = createServiceClient();
  // Admin boleh preview; user wajib ACTIVE.
  if (profile.role !== "ADMIN") {
    const { data: access } = await svc
      .from("product_access")
      .select("id")
      .eq("user_id", profile.id)
      .eq("product_id", productId)
      .eq("status", "ACTIVE")
      .limit(1);
    if (!access || access.length === 0)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: product } = await svc
    .from("products")
    .select("file_path, download_enabled")
    .eq("id", productId)
    .single();
  if (!product?.file_path)
    return NextResponse.json({ error: "File belum diupload" }, { status: 404 });
  if (!product.download_enabled && profile.role !== "ADMIN")
    return NextResponse.json({ error: "Download dinonaktifkan" }, { status: 403 });

  const { data, error } = await svc.storage
    .from("product-files")
    .createSignedUrl(product.file_path, 900, forceDownload ? { download: true } : undefined);
  if (error || !data)
    return NextResponse.json({ error: "Gagal membuat akses file" }, { status: 500 });
  return NextResponse.redirect(new URL(data.signedUrl, req.url));
}

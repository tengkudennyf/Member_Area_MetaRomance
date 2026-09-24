import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isDemoMode } from "@/lib/supabase/env";
import { FILES_DIR } from "@/lib/demo/store";

// Penyaji file demo (upload bukti/cover/PDF di mode demo). DEV ONLY.
// Nonaktif total di production (isDemoMode() selalu false di sana — B3).
const ALLOWED_BUCKETS = new Set([
  "product-covers",
  "product-files",
  "payment-proofs",
  "avatars",
  "event-covers",
]);

export async function GET(req: Request) {
  if (!isDemoMode()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket") ?? "";
  const filePath = searchParams.get("path") ?? "";
  if (!bucket || !filePath || !ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  // B4: normalisasi + resolve penuh, lalu pastikan hasil AKHIR tetap di dalam
  // FILES_DIR/<bucket>/. Menolak: "..", encoded "%2e%2e", "....//", absolut.
  const base = path.resolve(FILES_DIR, bucket);
  const full = path.resolve(base, filePath);
  if (full !== base && !full.startsWith(base + path.sep)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(full);
  } catch {
    return NextResponse.json({ error: "File tidak ada" }, { status: 404 });
  }
  if (!stat.isFile()) {
    return NextResponse.json({ error: "File tidak ada" }, { status: 404 });
  }
  const buf = fs.readFileSync(full);
  const ext = path.extname(full).toLowerCase();
  const type =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": type, "Content-Length": String(buf.length) },
  });
}

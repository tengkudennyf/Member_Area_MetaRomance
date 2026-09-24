// S6: validasi magic bytes — MIME `file.type` dan ekstensi nama file bisa
// dipalsukan attacker. Cek signature biner asli (4 byte pertama).
// JPEG: FF D8 · PNG: 89 50 · GIF: 47 49 · WEBP: 52 49 ("RI") + "WEBP" di byte 8-11
// PDF: 25 50 ("%P").

export type FileKind = "jpeg" | "png" | "gif" | "webp" | "pdf" | "unknown";

export async function detectFileKind(file: File): Promise<FileKind> {
  try {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (buf.length < 4) return "unknown";
    const b = (i: number): number => buf[i] ?? 0;
    if (b(0) === 0xff && b(1) === 0xd8) return "jpeg";
    if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "png";
    if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return "gif";
    if (
      b(0) === 0x52 &&
      b(1) === 0x49 &&
      b(2) === 0x46 &&
      b(3) === 0x46 &&
      b(8) === 0x57 &&
      b(9) === 0x45 &&
      b(10) === 0x42 &&
      b(11) === 0x50
    )
      return "webp";
    if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return "pdf";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Bukti transfer: JPG/PNG/PDF asli (bukan sekadar MIME/ekstensi). */
export async function isValidProofFile(file: File): Promise<boolean> {
  const k = await detectFileKind(file);
  return k === "jpeg" || k === "png" || k === "pdf";
}

/** Cover produk: gambar asli. */
export async function isValidImageFile(file: File): Promise<boolean> {
  const k = await detectFileKind(file);
  return k === "jpeg" || k === "png" || k === "gif" || k === "webp";
}

/** File ebook: PDF asli. */
export async function isValidPdfFile(file: File): Promise<boolean> {
  return (await detectFileKind(file)) === "pdf";
}

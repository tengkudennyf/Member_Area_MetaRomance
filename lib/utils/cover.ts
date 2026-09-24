// URL publik untuk cover (bucket public: product-covers, event-covers).
// Berfungsi server & client (cuma butuh NEXT_PUBLIC_SUPABASE_URL).
// Return null bila tidak ada path → caller tampilkan placeholder.
export function coverUrl(bucket: "product-covers" | "event-covers", path: string | null): string | null {
  if (!path || path.trim() === "") return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function productCoverUrl(path: string | null): string | null {
  return coverUrl("product-covers", path);
}

export function eventCoverUrl(path: string | null): string | null {
  return coverUrl("event-covers", path);
}

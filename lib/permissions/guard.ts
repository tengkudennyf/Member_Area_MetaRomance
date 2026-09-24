import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/types/db";

// §22–23 — server-side permission checking. RLS proteksi baris;
// fungsi ini proteksi aksi (approve, grant, admin route).
// B7: SATU-SATUNYA implementasi getUser → query profiles. Semua kode
// (termasuk lib/auth/session#getSession) harus memakai fungsi ini.
export async function getSessionProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();
  return { user, profile };
}

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "ADMIN";
}

export async function requireUser(supabase: SupabaseClient) {
  const { user, profile } = await getSessionProfile(supabase);
  if (!user || !profile) throw new Error("UNAUTHORIZED");
  return { user, profile };
}

export async function requireAdmin(supabase: SupabaseClient) {
  const { user, profile } = await requireUser(supabase);
  if (!isAdminRole(profile.role)) throw new Error("FORBIDDEN");
  return { user, profile };
}

// §15/§23 — cek akses produk / event milik user (dipakai sebelum signed URL).
export async function hasProductAccess(
  supabase: SupabaseClient,
  userId: string,
  productId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("product_access")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("status", "ACTIVE")
    .limit(1);
  return Boolean(data && data.length > 0);
}

export async function hasEventAccess(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "REGISTERED")
    .limit(1);
  if (data && data.length > 0) return true;
  // Event gratis yang dipublish: registrasi otomatis dianggap akses baca info
  return false;
}

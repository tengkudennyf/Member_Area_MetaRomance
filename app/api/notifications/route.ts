import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/permissions/guard";

// In-app notifications: user hanya baca miliknya (RLS + cek server).
export async function GET() {
  const supabase = await createClient();
  let profile;
  try {
    ({ profile } = await requireUser(supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  let profile;
  try {
    ({ profile } = await requireUser(supabase));
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  // Ownership check: hanya baris milik user yang bisa ditandai (§6 IDOR)
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("user_id", profile.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

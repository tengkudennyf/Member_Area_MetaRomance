import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "./env";
import { createDemoClient } from "@/lib/demo/client";

// Service role — SERVER ONLY (§29). Jangan import dari Client Component.
// Mode demo: kembalikan mock (tanpa RLS — DEV ONLY).
export function createServiceClient() {
  if (isDemoMode()) return createDemoClient() as unknown as ReturnType<typeof createClient>;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

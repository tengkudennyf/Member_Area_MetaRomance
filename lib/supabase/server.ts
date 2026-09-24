import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isDemoMode } from "./env";
import { createDemoClient } from "@/lib/demo/client";

export async function createClient() {
  if (isDemoMode()) return createDemoClient() as unknown as ReturnType<typeof createServerClient>;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                options as unknown as Parameters<typeof cookieStore.set>[2]
              )
            );
          } catch {
            // Server Component — aman diabaikan
          }
        },
      },
    }
  );
}

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseConfigured, isDemoMode } from "./env";
import { DEMO_COOKIE } from "@/lib/demo/cookie";

type BrowserClient = ReturnType<typeof createBrowserClient>;

// Mock browser untuk demo: auth.signOut + hitung notifikasi via API.
function createDemoBrowserClient(): BrowserClient {
  const chain = {
    select: () => chain,
    is: () => chain,
    eq: () => chain,
    limit: () => chain,
    then: (
      onf?: ((v: { data: null; error: null; count: number }) => unknown) | null,
      onr?: ((e: unknown) => unknown) | null
    ) => {
      const p = fetch("/api/notifications")
        .then((r) => r.json())
        .then((j) => ({
          data: null,
          error: null,
          count: ((j.notifications ?? []) as { read_at: string | null }[]).filter((n) => !n.read_at)
            .length,
        }))
        .catch(() => ({ data: null, error: null, count: 0 }));
      return p.then(onf, onr);
    },
  };
  return {
    auth: {
      signOut: async () => {
        document.cookie = `${DEMO_COOKIE}=; Max-Age=0; path=/`;
        return { error: null };
      },
    },
    from: () => chain,
  } as unknown as BrowserClient;
}

export function createClient(): BrowserClient {
  if (isDemoMode()) return createDemoBrowserClient();
  assertSupabaseConfigured();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

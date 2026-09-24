import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode } from "@/lib/supabase/env";
import { DEMO_COOKIE } from "@/lib/demo/cookie";

// §24 middleware/proxy: refresh sesi + proteksi route. Admin check final
// tetap server-side per halaman/aksi (§22).
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const protectedPath =
    path.startsWith("/member") ||
    path.startsWith("/checkout") ||
    path.startsWith("/payment") ||
    path.startsWith("/admin");

  // Demo lokal: cukup cek cookie sesi (DEV ONLY).
  if (isDemoMode()) {
    if (protectedPath && !req.cookies.get(DEMO_COOKIE)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.next();
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(
              name,
              value,
              options as unknown as Parameters<typeof res.cookies.set>[2]
            )
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (protectedPath && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // S14: /claim ikut refresh sesi, tapi TIDAK masuk protectedPath di atas
  // (tamu belum login boleh buka claim — halaman handle sendiri).
  matcher: ["/member/:path*", "/checkout/:path*", "/payment/:path*", "/admin/:path*", "/claim/:path*"],
};

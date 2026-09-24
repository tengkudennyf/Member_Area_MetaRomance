"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  BookOpen,
  Calendar,
  FileText,
  House,
  LayoutDashboard,
  Moon,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AccountMenu } from "@/components/auth/account-menu";
import { LangSwitcher, useLang } from "@/components/lang-provider";

// §39 nav + shell responsif (sidebar floating desktop, bottom nav mobile).
// Label nav member mengikuti bahasa aktif; admin tetap Indonesia (internal).
function useMemberNav() {
  const { t } = useLang();
  return [
    { href: "/member", label: t.nav.home, icon: House },
    { href: "/member/products", label: t.nav.library, icon: BookOpen },
    { href: "/member/store", label: t.nav.store, icon: ShoppingBag },
    { href: "/member/events", label: t.nav.event, icon: Calendar },
    { href: "/member/account", label: t.nav.account, icon: Users },
  ];
}

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/contents", label: "Konten Web", icon: FileText },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/revenue", label: "Pendapatan", icon: TrendingUp },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function useUnread(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact" })
          .is("read_at", null);
        setN(count ?? 0);
      } catch {
        /* abaikan */
      }
    })();
  }, []);
  return n;
}

function NavList({ items }: { items: { href: string; label: string; icon: typeof House }[] }) {
  const path = usePathname();
  return (
    <nav className="space-y-0.5">
      {items.map((n) => {
        const active =
          path === n.href ||
          (n.href !== "/member" && n.href !== "/admin" && path.startsWith(n.href));
        const Icon = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition ${
              active
                ? "bg-surface2 text-foreground font-medium"
                : "text-faint hover:text-foreground hover:bg-surface2/50"
            }`}
          >
            <Icon size={16} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  mode,
  children,
}: {
  mode: "member" | "admin";
  children: React.ReactNode;
}) {
  const unread = mode === "member" ? useUnread() : 0;
  const memberNav = useMemberNav();
  const items = mode === "member" ? memberNav : ADMIN_NAV;
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLang();

  return (
    <div className="flex min-h-screen bg-background">
      {/* BoardUI Flush Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-surface border-r border-border px-4 py-6 h-screen sticky top-0">
        <Link
          href={mode === "member" ? "/member" : "/admin"}
          className="flex items-center gap-2.5 px-2 mb-2"
        >
          <Sparkles size={18} className="text-foreground" />
          <span className="font-semibold text-[15px] tracking-tight text-foreground">Meta Romance</span>
        </Link>
        <p className="text-faint text-[10px] font-medium tracking-[0.1em] uppercase px-2 mb-6">
          {mode === "member" ? t.app.memberArea : "Admin Dashboard"}
        </p>
        <NavList items={items} />
        {mode === "member" && (
          <div className="mt-6 px-1">
            <p className="text-faint text-[10px] font-medium tracking-[0.1em] uppercase mb-2 px-1">{t.nav.explore}</p>
            <Link
              href="/member/orders"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-faint hover:text-foreground hover:bg-surface2/50 transition"
            >
              <Receipt size={16} /> {t.nav.orders}
            </Link>
          </div>
        )}
        <div className="mt-auto pt-4 flex flex-col gap-2 px-1">
          <div className="flex items-center justify-between px-2">
            <span className="text-faint text-[12px]">{t.nav.theme}</span>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="text-faint hover:text-foreground transition"
            >
              <Sun size={15} className="dark:hidden block" />
              <Moon size={15} className="hidden dark:block" />
            </button>
          </div>
          {mode === "member" && (
            <div className="flex items-center justify-between px-2">
              <LangSwitcher />
            </div>
          )}
          <AccountMenu mode={mode} />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 h-14 flex items-center gap-2">
          <Sparkles size={16} className="text-foreground" />
          <span className="font-semibold text-[15px] tracking-tight">Meta Romance</span>
          <span className="text-faint text-[11px] ml-1 flex-1">
            {mode === "member" ? t.app.memberArea : "Admin"}
          </span>
          <span className="ml-auto">
            <LangSwitcher compact />
          </span>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="text-faint hover:text-foreground transition ml-auto"
          >
            <Sun size={18} className="dark:hidden block" />
            <Moon size={18} className="hidden dark:block" />
          </button>
          {mode === "member" && (
            <Link
              href="/member/notifications"
              className="relative text-faint hover:text-foreground ml-2"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] rounded-full min-w-4 h-4 flex items-center justify-center px-1">
                  {unread}
                </span>
              )}
            </Link>
          )}
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto w-full pb-28 md:pb-8">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-30 bg-surface border border-border rounded-2xl px-2 py-2 flex justify-around shadow-lg">
        {(mode === "member" ? memberNav : ADMIN_NAV.slice(0, 4)).map((n) => {
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-col items-center gap-1 px-4 py-1.5 text-faint hover:text-accent transition"
            >
              <Icon size={19} />
              <span className="text-[10px]">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

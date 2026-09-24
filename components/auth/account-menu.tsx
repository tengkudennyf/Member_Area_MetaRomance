"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, LogOut, Settings, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/lang-provider";

// Widget akun floating di kiri-bawah sidebar (member + admin).
// Avatar lingkaran berisi inisial nama user. Klik → popup menu:
// Account Settings, Account, Log Out (seperti contoh referensi).
// Toggle dark theme TIDAK di sini — tetap di baris Theme sidebar.
function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  if (first && last) return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  if (first.length >= 2) return first.slice(0, 2).toUpperCase();
  if (email) return (email[0] ?? "?").toUpperCase();
  return "?";
}

export function AccountMenu({ mode }: { mode: "member" | "admin" }) {
  const router = useRouter();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email ?? "");
        const { data: prof } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("auth_user_id", user.id)
          .single();
        const p = prof as { name: string; email: string } | null;
        if (p?.name) setName(p.name);
        if (p?.email) setEmail(p.email);
      } catch {
        /* abaikan — tampilkan fallback */
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const logout = async () => {
    try {
      await createClient().auth.signOut();
    } catch {
      /* belum dikonfigurasi — tetap keluar */
    }
    router.replace("/login");
  };

  const displayName = name || email.split("@")[0] || t.nav.account;

  return (
    <div ref={boxRef} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-xl shadow-lg p-2 z-40">
          {mode === "member" ? (
            <Link
              href="/member/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-foreground hover:bg-surface2 transition"
            >
              <Settings size={15} className="text-faint" />
              {t.nav.accountSettings}
            </Link>
          ) : (
            <Link
              href="/member/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-foreground hover:bg-surface2 transition"
            >
              <Users size={15} className="text-faint" />
              {t.nav.account}
            </Link>
          )}
          <button
            onClick={logout}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium text-danger border border-danger/30 hover:bg-danger/10 transition"
          >
            <LogOut size={15} /> {t.nav.logOut}
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-surface2/50 transition text-left"
      >
        <span className="w-8 h-8 shrink-0 rounded-full bg-accent text-on-accent flex items-center justify-center text-[12px] font-bold">
          {initialsOf(name, email)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[12px] font-medium text-foreground truncate">{displayName}</span>
          <span className="block text-[11px] text-faint truncate">{email}</span>
        </span>
        <ChevronUp
          size={14}
          className={`text-faint transition-transform shrink-0 ${open ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}

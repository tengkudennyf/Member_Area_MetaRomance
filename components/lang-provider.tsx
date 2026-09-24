"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDict, LANG_COOKIE, normalizeLang, type Dict, type Lang } from "@/lib/i18n/dictionaries";

// Bahasa client-side: baca cookie awal (diset server), toggle tulis cookie +
// localStorage lalu refresh agar server components ikut ganti bahasa.
const LangContext = createContext<{ lang: Lang; t: Dict; setLang: (l: Lang) => void } | undefined>(
  undefined
);

function readInitial(): Lang {
  if (typeof document === "undefined") return "id";
  const m = document.cookie.match(/(?:^|;\s*)mr_lang=(id|en)/);
  if (m?.[1]) return normalizeLang(m[1]);
  try {
    return normalizeLang(window.localStorage.getItem("mr_lang"));
  } catch {
    return "id";
  }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Selalu "id" saat render pertama (server + hydration) agar tidak mismatch;
  // bahasa asli dari cookie dibaca di effect (client-only).
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    setLangState(readInitial());
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      try {
        window.localStorage.setItem("mr_lang", l);
      } catch {
        /* abaikan */
      }
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    },
    [router]
  );

  return <LangContext.Provider value={{ lang, t: getDict(lang), setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}

// Toggle ID | EN kompak untuk sidebar/header.
export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const btn = (l: Lang, label: string) => (
    <button
      key={l}
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={`px-2 py-1 text-[11px] font-medium rounded transition ${
        lang === l ? "bg-accent text-on-accent" : "text-faint hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <span
      className={`inline-flex items-center gap-0.5 border border-border rounded-md p-0.5 ${compact ? "" : ""}`}
      title="Bahasa / Language"
    >
      {btn("id", "ID")}
      {btn("en", "EN")}
    </span>
  );
}

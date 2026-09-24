"use client";

import { useEffect, useRef, useState } from "react";

// Widget Cloudflare Turnstile TANPA dependensi tambahan.
// Pakai explicit render: token dikirim via onVerify ke parent (disimpan di
// state form lalu ikut FormData sebagai `captchaToken`).
// Site key test Cloudflare (lolos otomatis, untuk E2E): 1x00000000000000000000AA
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: string;
        }
      ) => string;
      reset?: (id?: string) => void;
      remove?: (id?: string) => void;
    };
    __turnstileLoaded?: boolean;
  }
}

export default function Turnstile({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  useEffect(() => {
    if (!sitekey) {
      setFailed(true);
      return;
    }
    let widgetId: string | undefined;
    let cancelled = false;
    const render = () => {
      if (cancelled || !boxRef.current || !window.turnstile) return;
      try {
        widgetId = window.turnstile.render(boxRef.current, {
          sitekey,
          theme: "dark",
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => setFailed(true),
        });
      } catch {
        setFailed(true);
      }
    };
    if (window.turnstile) {
      render();
    } else if (!window.__turnstileLoaded) {
      window.__turnstileLoaded = true;
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = render;
      s.onerror = () => setFailed(true);
      document.head.appendChild(s);
    } else {
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          render();
        }
      }, 200);
      const stop = setTimeout(() => clearInterval(t), 8000);
      return () => {
        cancelled = true;
        clearInterval(t);
        clearTimeout(stop);
        if (widgetId && window.turnstile?.remove) {
          try {
            window.turnstile.remove(widgetId);
          } catch {
            /* abaikan */
          }
        }
      };
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          /* abaikan */
        }
      }
    };
  }, [sitekey]);

  if (!sitekey || failed) {
    return (
      <p className="text-warning text-[12px]">
        Verifikasi robot tidak termuat — refresh halaman. Bila berlanjut, hubungi admin.
      </p>
    );
  }
  return <div ref={boxRef} className="flex justify-center" />;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Field, inputCls } from "@/components/ui/kit";
import { useLang } from "@/components/lang-provider";

// Komponen pengganti sementara Cloudflare Turnstile.
// S8: gambar captcha dari GET /api/auth/challenge (SVG) — kode TIDAK PERNAH
// ada sebagai teks di response/JS (bot butuh OCR). Nilai ekspektasi hanya di
// cookie httpOnly server-side. S10: endpoint di-rate-limit 20/mnt/IP.
// TODO(prod): ganti kembali dengan components/auth/turnstile.tsx.
export default function VerificationCode({
  value,
  onChange,
  error,
  inputProps = {},
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const [imgUrl, setImgUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const urlRef = useRef("");
  const { t } = useLang();

  const fetchCode = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      // Cache-buster: tiap refresh = kode + cookie baru.
      const res = await fetch(`/api/auth/challenge?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setImgUrl(url);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCode();
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [fetchCode]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          aria-label={t.auth.codeLabel}
          className="flex-1 select-none flex items-center justify-center bg-surface2 border border-border rounded-md px-3 h-16"
        >
          {loading ? (
            <span className="text-[13px] font-sans tracking-normal text-faint">{t.auth.codeLoading}</span>
          ) : failed ? (
            <span className="text-[13px] font-sans tracking-normal text-danger">
              {t.auth.codeFailed}
            </span>
          ) : (
            <img src={imgUrl} alt={t.auth.codeImgHint} className="h-14 select-none" draggable={false} />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange("");
            void fetchCode();
          }}
          disabled={loading}
          title={t.auth.refreshCode}
          className="inline-flex items-center justify-center w-12 h-16 rounded-md border border-border bg-surface hover:bg-surface2 text-foreground transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <Field label={t.auth.codeLabel} error={error}>
        <input
          className={`${inputCls} uppercase font-mono tracking-[0.3em]`}
          placeholder={t.auth.codePh}
          maxLength={5}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
          {...inputProps}
        />
      </Field>
      <p className="text-faint text-[12px]">{t.auth.codeImgHint}</p>
    </div>
  );
}

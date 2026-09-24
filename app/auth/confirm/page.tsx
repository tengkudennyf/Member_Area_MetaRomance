"use client";

import { Suspense, useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/supabase/env";
import { claimAfterConfirmAction, resendConfirmAction } from "@/actions/auth";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
// TODO(prod): kembalikan Turnstile saat balik ke Cloudflare.
import VerificationCode from "@/components/auth/verification-code";
import { useLang } from "@/components/lang-provider";

// Landing link konfirmasi email Supabase. Dua flow didukung:
// 1. PKCE (?code=...) — dari daftar via aplikasi (supabase-js).
//    Code ditukar jadi sesi.
// 2. Implicit (#access_token=...) — dari signup non-PKCE (REST/SDK lama).
//    supabase-js browser otomatis membaca fragment saat client dibuat.
// Link basi/sudah dipakai → form kirim ulang (tanpa daftar ulang).
function safeNext(v: string | null): string {
  if (v && v.startsWith("/") && !v.startsWith("//")) return v;
  return "/member";
}

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const { t } = useLang();
  const [status, setStatus] = useState<"kerja" | "gagal">("kerja");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendState, resendAct] = useActionState(resendConfirmAction, { ok: false });
  const [resendPending, startResend] = useTransition();
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (isDemoMode()) {
      setStatus("gagal");
      return;
    }
    const code = sp.get("code");
    const next = safeNext(sp.get("next"));
    const supabase = createClient();
    (async () => {
      try {
        // Flow 1: tukar code PKCE (server action / SDK mendaftarkan verifier).
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          await claimAfterConfirmAction().catch(() => ({ claimed: 0 }));
          router.replace(next);
          return;
        }
        // Flow 2: fragment implicit dibaca otomatis oleh browser client
        // (detectSessionInUrl). Tunggu sesi terbentuk.
        for (let i = 0; i < 40; i += 1) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            await claimAfterConfirmAction().catch(() => ({ claimed: 0 }));
            router.replace(next);
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        setStatus("gagal");
      } catch (e) {
        // S16: detail teknis (versi Supabase/jenis error internal) hanya ke
        // console — user cukup lihat pesan generik di bawah.
        if (process.env.NODE_ENV !== "production") {
          console.error("[auth/confirm]", e);
        }
        setStatus("gagal");
      }
    })();
  }, [router, sp]);

  useEffect(() => {
    if (resendState.error) toast("err", resendState.error);
    if (resendState.ok) setResendDone(true);
  }, [resendState, toast]);

  if (status === "gagal") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <p className="font-display text-[20px] mb-2">{t.auth.invalidLink}</p>
          <p className="text-faint text-[13px] mb-2">
            {t.auth.invalidLinkDesc}
          </p>
          {!resendDone ? (
            <form
              className="mt-4 space-y-3 text-left"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set("email", email);
                fd.set("verificationCode", verificationCode);
                startResend(() => resendAct(fd));
              }}
            >
              <Field label={t.auth.registeredEmail}>
                <input
                  className={inputCls}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.registeredEmailPh}
                />
              </Field>
              <VerificationCode value={verificationCode} onChange={setVerificationCode} />
              <Btn type="submit" disabled={resendPending} className="w-full">
                {resendPending ? t.auth.resending : t.auth.resendLink}
              </Btn>
            </form>
          ) : (
            <p className="text-accent text-[13px] mt-4">
              {t.auth.resentInfo}
            </p>
          )}
          <p className="mt-4">
            <Link href="/login" className="text-accent hover:underline text-[13px]">
              {t.auth.backToLogin}
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <p className="font-display text-[20px] mb-2">{t.auth.verifying}</p>
        <p className="text-faint text-[13px]">{t.auth.verifyingDesc}</p>
      </Card>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

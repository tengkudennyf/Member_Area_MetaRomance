"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useActionState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { loginSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
// Sementara pengganti Turnstile → Login Verification Code 5 huruf.
// TODO(prod): kembalikan `import Turnstile from "@/components/auth/turnstile"`
// + state captcha + disabled={pending || !captcha} saat balik ke Cloudflare.
import VerificationCode from "@/components/auth/verification-code";
import { LangSwitcher, useLang } from "@/components/lang-provider";

type Form = z.infer<typeof loginSchema>;

function Inner() {
  const { t } = useLang();
  const next = useSearchParams().get("next") ?? "/member";
  const registered = useSearchParams().get("registered");
  const reset = useSearchParams().get("reset");
  const confirmed = useSearchParams().get("confirmed");
  const err = useSearchParams().get("error");
  const { toast } = useToast();
  const [state, action] = useActionState(loginAction, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(loginSchema),
    defaultValues: { verificationCode: "" },
  });
  const verificationCode = watch("verificationCode") ?? "";

  useEffect(() => {
    if (registered) toast("ok", t.auth.madeCheckEmail);
    if (confirmed) toast("ok", t.auth.verifiedLogin);
    if (reset) toast("ok", t.auth.pwUpdatedLogin);
    if (err === "confirm") toast("err", t.auth.confirmInvalid);
    if (state.error) toast("err", state.error);
  }, [registered, confirmed, reset, err, state.error, toast, t]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-accent" />
          <span className="font-display text-[20px]">{t.app.name}</span>
          <span className="ml-auto">
            <LangSwitcher compact />
          </span>
        </div>
        <p className="text-faint text-[13px] mb-6">{t.auth.memberLogin}</p>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((data) => {
            const fd = new FormData();
            fd.set("email", data.email);
            fd.set("password", data.password);
            fd.set("next", next);
            fd.set("verificationCode", data.verificationCode);
            start(() => action(fd));
          })}
        >
          <Field label={t.auth.email} error={errors.email?.message}>
            <input
              className={inputCls}
              type="email"
              placeholder={t.auth.emailPh}
              {...register("email")}
            />
          </Field>
          <Field label={t.auth.password} error={errors.password?.message}>
            <input
              className={inputCls}
              type="password"
              placeholder={t.auth.passwordPh}
              {...register("password")}
            />
          </Field>
          <VerificationCode
            value={verificationCode}
            onChange={(v) => setValue("verificationCode", v, { shouldValidate: true })}
            error={errors.verificationCode?.message}
          />
          <Btn type="submit" disabled={pending} className="w-full">
            {pending ? t.auth.checking : t.auth.loginBtn}
          </Btn>
          <p className="text-faint text-[13px] text-center">
            {t.auth.noAccount}{" "}
            <Link href="/register" className="text-accent hover:underline">
              {t.auth.register}
            </Link>
            {" · "}
            <Link href="/forgot-password" className="text-accent hover:underline">
              {t.auth.forgot}
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

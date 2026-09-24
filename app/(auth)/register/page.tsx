"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useActionState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { registerAction } from "@/actions/auth";
import { registerSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
// TODO(prod): kembalikan Turnstile saat balik ke Cloudflare.
import VerificationCode from "@/components/auth/verification-code";
import { LangSwitcher, useLang } from "@/components/lang-provider";

type Form = z.infer<typeof registerSchema>;

function Inner() {
  const { t } = useLang();
  const rawNext = useSearchParams().get("next") ?? "";
  // S5: tolak protocol-relative "//evil.com" (client-side, tanpa import server).
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const { toast } = useToast();
  const [state, action] = useActionState(registerAction, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(registerSchema),
    defaultValues: { verificationCode: "" },
  });
  const verificationCode = watch("verificationCode") ?? "";

  useEffect(() => {
    if (state.error) toast("err", state.error);
  }, [state.error, toast]);

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
        <p className="text-faint text-[13px] mb-6">{t.auth.createAccount}</p>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((data) => {
            const fd = new FormData();
            fd.set("name", data.name);
            fd.set("email", data.email);
            fd.set("phone", data.phone);
            fd.set("password", data.password);
            fd.set("confirm", data.confirm);
            fd.set("verificationCode", data.verificationCode);
            if (next) fd.set("next", next);
            start(() => action(fd));
          })}
        >
          <Field label={t.auth.name} error={errors.name?.message}>
            <input className={inputCls} placeholder={t.auth.namePh} {...register("name")} />
          </Field>
          <Field label={t.auth.email} error={errors.email?.message}>
            <input
              className={inputCls}
              type="email"
              placeholder={t.auth.emailPh}
              {...register("email")}
            />
          </Field>
          <Field label={t.auth.phone} error={errors.phone?.message}>
            <input className={inputCls} placeholder={t.auth.phonePh} {...register("phone")} />
          </Field>
          <Field label={t.auth.password} error={errors.password?.message}>
            <input
              className={inputCls}
              type="password"
              placeholder={t.auth.passwordMin}
              {...register("password")}
            />
          </Field>
          <Field label={t.auth.confirmPw} error={errors.confirm?.message}>
            <input
              className={inputCls}
              type="password"
              placeholder={t.auth.confirmPwPh}
              {...register("confirm")}
            />
          </Field>
          <VerificationCode
            value={verificationCode}
            onChange={(v) => setValue("verificationCode", v, { shouldValidate: true })}
            error={errors.verificationCode?.message}
          />
          <Btn type="submit" disabled={pending} className="w-full">
            {pending ? t.auth.creating : t.auth.registerBtn}
          </Btn>
          <p className="text-faint text-[13px] text-center">
            {t.auth.haveAccount}{" "}
            <Link href={loginHref} className="text-accent hover:underline">
              {t.auth.login}
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

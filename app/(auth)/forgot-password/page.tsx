"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { forgotAction } from "@/actions/auth";
import { forgotSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
// TODO(prod): kembalikan Turnstile saat balik ke Cloudflare.
import VerificationCode from "@/components/auth/verification-code";
import { LangSwitcher, useLang } from "@/components/lang-provider";

type Form = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const [state, action] = useActionState(forgotAction, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { verificationCode: "" },
  });
  const verificationCode = watch("verificationCode") ?? "";

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", t.auth.resetSent);
  }, [state, toast, t]);

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
        <p className="text-faint text-[13px] mb-6">{t.auth.resetViaEmail}</p>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((data) => {
            const fd = new FormData();
            fd.set("email", data.email);
            fd.set("verificationCode", data.verificationCode);
            start(() => action(fd));
          })}
        >
          <Field label={t.auth.accountEmail} error={errors.email?.message}>
            <input
              className={inputCls}
              type="email"
              placeholder={t.auth.emailPh}
              {...register("email")}
            />
          </Field>
          <VerificationCode
            value={verificationCode}
            onChange={(v) => setValue("verificationCode", v, { shouldValidate: true })}
            error={errors.verificationCode?.message}
          />
          <Btn type="submit" disabled={pending} className="w-full">
            {pending ? t.auth.sending : t.auth.sendReset}
          </Btn>
          <p className="text-faint text-[13px] text-center">
            <Link href="/login" className="text-accent hover:underline">
              {t.auth.backLogin}
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}

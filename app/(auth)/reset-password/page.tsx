"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { resetAction } from "@/actions/auth";
import { resetSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
import { LangSwitcher, useLang } from "@/components/lang-provider";

type Form = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const [state, action] = useActionState(resetAction, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(resetSchema),
  });

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
        <p className="text-faint text-[13px] mb-6">{t.auth.newPassword}</p>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((data) => {
            const fd = new FormData();
            fd.set("password", data.password);
            fd.set("confirm", data.confirm);
            start(() => action(fd));
          })}
        >
          <Field label={t.auth.newPwLabel} error={errors.password?.message}>
            <input
              className={inputCls}
              type="password"
              placeholder={t.auth.passwordMin}
              {...register("password")}
            />
          </Field>
          <Field label={t.auth.confirmNewPw} error={errors.confirm?.message}>
            <input
              className={inputCls}
              type="password"
              placeholder={t.auth.repeatPw}
              {...register("confirm")}
            />
          </Field>
          <Btn type="submit" disabled={pending} className="w-full">
            {pending ? t.auth.saving : t.auth.savePw}
          </Btn>
        </form>
      </Card>
    </div>
  );
}

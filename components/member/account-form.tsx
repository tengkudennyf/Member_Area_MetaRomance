"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useTransition } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/auth";
import { passwordChangeSchema, profileSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { AppShell } from "@/components/shell";
import { Btn, Card, Field, PageHeader, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/components/lang-provider";

type Form = z.infer<typeof profileSchema>;

export default function AccountClient({
  email,
  name,
  phone,
}: {
  email: string;
  name: string;
  phone: string;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const [state, action] = useActionState(updateProfileAction, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone },
  });

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", t.account.saved);
  }, [state, toast, t]);

  return (
    <AppShell mode="member">
      <PageHeader title={t.account.title} desc={t.account.desc} />
      <Card className="mb-4">
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-4">{t.account.profile}</p>
        <form
          className="space-y-4 max-w-md"
          onSubmit={handleSubmit((data) => {
            const fd = new FormData();
            fd.set("name", data.name);
            fd.set("phone", data.phone);
            start(() => action(fd));
          })}
        >
          <Field label={t.account.email}>
            <input className={inputCls + " opacity-60"} value={email} disabled />
          </Field>
          <Field label={t.account.name} error={errors.name?.message}>
            <input className={inputCls} autoComplete="name" {...register("name")} />
          </Field>
          <Field label={t.account.phone} error={errors.phone?.message}>
            <input className={inputCls} autoComplete="tel" {...register("phone")} />
          </Field>
          <Btn type="submit" disabled={pending}>
            {pending ? t.account.saving : t.account.save}
          </Btn>
        </form>
      </Card>
      <PasswordCard />
    </AppShell>
  );
}

type PwForm = z.infer<typeof passwordChangeSchema>;

function PasswordCard() {
  const { toast } = useToast();
  const { t } = useLang();
  const [state, action] = useActionState(changePasswordAction, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PwForm>({
    resolver: zodResolver(passwordChangeSchema),
  });

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) {
      toast("ok", t.account.pwUpdated);
      reset();
    }
  }, [state, toast, reset, t]);

  return (
    <Card>
      <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-4">{t.account.changePw}</p>
      <form
        className="space-y-4 max-w-md"
        onSubmit={handleSubmit((data) => {
          const fd = new FormData();
          fd.set("current", data.current);
          fd.set("password", data.password);
          fd.set("confirm", data.confirm);
          start(() => action(fd));
        })}
      >
        <Field label={t.account.currentPw} error={errors.current?.message}>
          <input className={inputCls} type="password" autoComplete="current-password" {...register("current")} />
        </Field>
        <Field label={t.account.newPw} error={errors.password?.message}>
          <input className={inputCls} type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label={t.account.confirmNewPw} error={errors.confirm?.message}>
          <input className={inputCls} type="password" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Btn type="submit" disabled={pending}>
          {pending ? t.account.processing : t.account.changePwBtn}
        </Btn>
      </form>
    </Card>
  );
}

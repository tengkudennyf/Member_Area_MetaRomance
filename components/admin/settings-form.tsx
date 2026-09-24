"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateSettingsAction } from "@/actions/settings";
import { settingsSchema, type BankAccount } from "@/lib/validations/schemas";
import { z } from "zod";
import { AppShell } from "@/components/shell";
import { Btn, Card, Field, PageHeader, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

type Form = z.infer<typeof settingsSchema>;

function parse(value: string | undefined, fb: string): string {
  if (!value) return fb;
  try {
    const v = JSON.parse(value) as unknown;
    return typeof v === "string" ? v : fb;
  } catch {
    return value;
  }
}

// Nilai tersimpan bisa array baru [{bank, number, name}] atau string lama
// ("BCA - 123 a.n. X"). String lama dipetakan ke 1 baris agar bisa dipecah manual.
function parseBanks(value: string | undefined): BankAccount[] {
  const empty: BankAccount[] = [{ bank: "", number: "", name: "" }];
  if (!value) return empty;
  try {
    const v = JSON.parse(value) as unknown;
    if (Array.isArray(v)) {
      const rows = v
        .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
        .map((r) => ({
          bank: String(r.bank ?? ""),
          number: String(r.number ?? ""),
          name: String(r.name ?? ""),
        }));
      return rows.length > 0 ? rows : empty;
    }
    if (typeof v === "string" && v.trim()) return [{ bank: v.trim(), number: "", name: "" }];
  } catch {
    if (value.trim()) return [{ bank: value.trim(), number: "", name: "" }];
  }
  return empty;
}

export default function SettingsClient({
  initial,
}: {
  initial: Record<string, string | undefined>;
}) {
  const { toast } = useToast();
  const [state, action] = useActionState(updateSettingsAction, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      bank_account: parseBanks(initial.bank_account),
      support_contact: parse(initial.support_contact, ""),
      payment_instruction: parse(initial.payment_instruction, ""),
      event_join_window: parse(initial.event_join_window, "60"),
      download_policy: parse(initial.download_policy, ""),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "bank_account" });

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", "Settings tersimpan.");
  }, [state, toast]);

  const submit = (data: Form) => {
    const fd = new FormData();
    fd.set("bank_account", JSON.stringify(data.bank_account));
    fd.set("support_contact", data.support_contact);
    fd.set("payment_instruction", data.payment_instruction);
    fd.set("event_join_window", data.event_join_window);
    fd.set("download_policy", data.download_policy);
    start(() => action(fd));
  };

  return (
    <AppShell mode="admin">
      <PageHeader title="Settings" desc="Operasional tanpa SQL manual." />
      <form onSubmit={handleSubmit(submit)} className="space-y-4 max-w-2xl">
        <Card>
          <div className="space-y-3">
            <div>
              <p className="block text-foreground font-medium text-[13px] mb-1.5">
                Bank accounts (bisa lebih dari satu)
              </p>
              {typeof errors.bank_account?.message === "string" && (
                <span className="block text-danger text-[12px] mt-1.5 mb-2">
                  {errors.bank_account.message}
                </span>
              )}
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="flex gap-2 items-start bg-surface2/50 border border-border rounded-md p-2.5">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr] gap-2">
                      <Field label="Bank" error={errors.bank_account?.[i]?.bank?.message}>
                        <input
                          className={inputCls}
                          placeholder="cth BCA"
                          {...register(`bank_account.${i}.bank`)}
                        />
                      </Field>
                      <Field label="Nomor rekening" error={errors.bank_account?.[i]?.number?.message}>
                        <input
                          className={inputCls}
                          placeholder="cth 1234567890"
                          inputMode="numeric"
                          {...register(`bank_account.${i}.number`)}
                        />
                      </Field>
                      <Field label="Atas nama" error={errors.bank_account?.[i]?.name?.message}>
                        <input
                          className={inputCls}
                          placeholder="cth Meta Romance"
                          {...register(`bank_account.${i}.name`)}
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={fields.length <= 1}
                      title="Hapus rekening ini"
                      className="mt-7 p-2 rounded-md text-faint hover:text-danger hover:bg-danger/10 transition disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {fields.length < 10 && (
                <button
                  type="button"
                  onClick={() => append({ bank: "", number: "", name: "" })}
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
                >
                  <Plus size={14} /> Tambah rekening
                </button>
              )}
            </div>
            <Field label="Payment instructions" error={errors.payment_instruction?.message}>
              <textarea className={inputCls} rows={3} {...register("payment_instruction")} />
            </Field>
            <Field label="Support WhatsApp / email" error={errors.support_contact?.message}>
              <input className={inputCls} {...register("support_contact")} />
            </Field>
            <Field label="Main website URL (env, read-only)">
              <input
                className={inputCls + " opacity-60"}
                value={process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? ""}
                disabled
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Default event join window (menit)"
                error={errors.event_join_window?.message}
              >
                <input className={inputCls} {...register("event_join_window")} />
              </Field>
              <Field label="Download policy" error={errors.download_policy?.message}>
                <input className={inputCls} {...register("download_policy")} />
              </Field>
            </div>
          </div>
        </Card>
        <Btn type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan settings"}
        </Btn>
      </form>
    </AppShell>
  );
}

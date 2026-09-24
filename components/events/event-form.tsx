"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useTransition } from "react";
import { createEventAction, updateEventAction } from "@/actions/events";
import { eventSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import type { EventItem } from "@/types/db";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

type Form = z.infer<typeof eventSchema>;

function toLocal(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function EventForm({ existing }: { existing?: EventItem }) {
  const { toast } = useToast();
  const action = existing ? updateEventAction.bind(null, existing.id) : createEventAction;
  const [state, dispatch] = useActionState(action, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(eventSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          description: existing.description,
          pillar: existing.pillar,
          event_type: existing.event_type,
          platform: existing.platform,
          meeting_url: existing.meeting_url ?? "",
          start_at: toLocal(existing.start_at),
          end_at: toLocal(existing.end_at),
          price: existing.price,
          quota: existing.quota,
          status: existing.status,
        }
      : { platform: "ZOOM", event_type: "WORKSHOP", status: "DRAFT" },
  });

  useEffect(() => {
    if (state.error) toast("err", state.error);
  }, [state.error, toast]);

  const submit = (data: Form) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) {
      if (v == null) continue;
      fd.set(k, String(v));
    }
    const cover = (document.getElementById("event-cover") as HTMLInputElement | null)?.files?.[0];
    if (cover) fd.set("cover", cover);
    start(() => dispatch(fd));
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 max-w-2xl">
      <Card>
        <div className="space-y-3">
          <Field label="Title" error={errors.title?.message}>
            <input className={inputCls} {...register("title")} />
          </Field>
          <Field label="Slug" error={errors.slug?.message}>
            <input className={inputCls} {...register("slug")} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <textarea className={inputCls} rows={3} {...register("description")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pillar">
              <select className={inputCls} {...register("pillar")}>
                <option value="5D_CONSCIOUSNESS">5D Consciousness</option>
                <option value="ROMANCE_ATTRACTION">Romance & Attraction</option>
                <option value="FINANCIAL_CAREER">Financial & Career</option>
                <option value="MANIFESTATION_TOOLS">Manifestation Tools</option>
              </select>
            </Field>
            <Field label="Event Type">
              <select className={inputCls} {...register("event_type")}>
                {["WEBINAR", "WORKSHOP", "CLASS", "SPECIAL_SESSION"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
              <select className={inputCls} {...register("platform")}>
                {["ZOOM", "GOOGLE_MEET", "YOUTUBE", "OTHER"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cover (gambar ≤5MB)">
              <input
                id="event-cover"
                type="file"
                accept="image/*"
                className="text-[13px] text-faint"
              />
            </Field>
          </div>
          <Field label="Meeting URL (hanya terlihat peserta)" error={errors.meeting_url?.message}>
            <input className={inputCls} placeholder="https://…" {...register("meeting_url")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" error={errors.start_at?.message}>
              <input className={inputCls} type="datetime-local" {...register("start_at")} />
            </Field>
            <Field label="End" error={errors.end_at?.message}>
              <input className={inputCls} type="datetime-local" {...register("end_at")} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price" error={errors.price?.message}>
              <input className={inputCls} inputMode="numeric" {...register("price")} />
            </Field>
            <Field label="Quota">
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="kosong = tanpa batas"
                {...register("quota", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
              />
            </Field>
            <Field label="Status">
              <select className={inputCls} {...register("status")}>
                {["DRAFT", "PUBLISHED", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>
        </div>
      </Card>
      <Btn type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : existing ? "Simpan" : "Buat event"}
      </Btn>
    </form>
  );
}

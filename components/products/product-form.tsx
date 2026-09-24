"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useTransition } from "react";
import { createProductAction, updateProductAction } from "@/actions/products";
import { productSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import type { Product } from "@/types/db";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

type Form = z.infer<typeof productSchema>;

export default function ProductForm({ existing }: { existing?: Product }) {
  const { toast } = useToast();
  const action = existing ? updateProductAction.bind(null, existing.id) : createProductAction;
  const [state, dispatch] = useActionState(action, { ok: false });
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(productSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          description: existing.description,
          pillar: existing.pillar,
          product_type: existing.product_type,
          price: existing.price,
          original_price: existing.original_price,
          download_enabled: existing.download_enabled,
          access_type: existing.access_type,
          status: existing.status,
        }
      : { product_type: "EBOOK", access_type: "LIFETIME", status: "DRAFT", download_enabled: true },
  });

  useEffect(() => {
    if (state.error) toast("err", state.error);
  }, [state.error, toast]);

  const submit = (data: Form) => {
    const fd = new FormData();
    fd.set("title", data.title);
    fd.set("slug", data.slug);
    fd.set("description", data.description);
    fd.set("pillar", data.pillar);
    fd.set("product_type", data.product_type);
    fd.set("price", String(data.price));
    fd.set("original_price", data.original_price == null ? "" : String(data.original_price));
    if (data.download_enabled) fd.set("download_enabled", "on");
    fd.set("access_type", data.access_type);
    fd.set("status", data.status);
    start(() => dispatch(fd));
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 max-w-2xl">
      <Card>
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">
          Basic Information
        </p>
        <div className="space-y-3">
          <Field label="Product Name" error={errors.title?.message}>
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
            <Field label="Product Type">
              <select className={inputCls} {...register("product_type")}>
                {["EBOOK", "WORKBOOK", "JOURNAL", "GUIDE", "DIGITAL_MATERIAL"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Card>
      <Card>
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">Pricing</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Selling Price" error={errors.price?.message}>
            <input className={inputCls} inputMode="numeric" {...register("price")} />
          </Field>
          <Field label="Original Price">
            <input
              className={inputCls}
              inputMode="numeric"
              placeholder="opsional"
              {...register("original_price", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
            />
          </Field>
        </div>
      </Card>
      <Card>
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">Access</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Access Type">
            <select className={inputCls} {...register("access_type")}>
              <option value="LIFETIME">Lifetime</option>
              <option value="LIMITED">Limited</option>
            </select>
          </Field>
          <Field label="Publishing">
            <select className={inputCls} {...register("status")}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] mt-3">
          <input type="checkbox" {...register("download_enabled")} /> Allow Download
        </label>
      </Card>
      <Btn type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : existing ? "Simpan" : "Save Draft"}
      </Btn>
    </form>
  );
}

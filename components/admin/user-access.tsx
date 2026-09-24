"use client";

import { useActionState, useEffect, useTransition } from "react";
import { grantAccessAction, revokeAccessAction } from "@/actions/products";
import { Btn, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/types/db";

export function GrantAccessForm({ userId, products }: { userId: string; products: Product[] }) {
  const { toast } = useToast();
  const [state, action] = useActionState(grantAccessAction, { ok: false });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", "Akses diberikan.");
  }, [state, toast]);

  return (
    <form
      className="grid md:grid-cols-3 gap-3 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => action(new FormData(e.currentTarget)));
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <Field label="Product">
        <select name="productId" className={inputCls} required defaultValue="">
          <option value="">— pilih —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reason">
        <input
          name="reason"
          className={inputCls}
          placeholder="bonus / promo / koreksi"
          maxLength={300}
        />
      </Field>
      <Btn type="submit" disabled={pending}>
        Beri akses
      </Btn>
    </form>
  );
}

export function RevokeButton({ accessId }: { accessId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(() => {
          void revokeAccessAction(accessId);
        })
      }
      className="text-danger text-[12px] hover:underline disabled:opacity-50"
    >
      Revoke
    </button>
  );
}

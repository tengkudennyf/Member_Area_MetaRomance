"use client";

import { useActionState, useTransition } from "react";
import { checkoutAction } from "@/actions/orders";
import { Btn, inputCls, labelCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/components/lang-provider";
import { useEffect } from "react";

export default function CheckoutForm({
  productId,
  eventId,
  userName,
  userEmail,
}: {
  productId?: string;
  eventId?: string;
  userName: string;
  userEmail: string;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const [state, action] = useActionState(checkoutAction, { ok: false });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (state.error) toast("err", state.error);
  }, [state.error, toast]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => action(new FormData(e.currentTarget)));
      }}
    >
      {productId && <input type="hidden" name="productId" value={productId} />}
      {eventId && <input type="hidden" name="eventId" value={eventId} />}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <p className={labelCls}>{t.account.name}</p>
          <input className={inputCls + " opacity-60"} value={userName} disabled />
        </div>
        <div>
          <p className={labelCls}>{t.account.email}</p>
          <input className={inputCls + " opacity-60"} value={userEmail} disabled />
        </div>
      </div>
      <div>
        <p className={labelCls}>{t.checkout.notes}</p>
        <input
          name="notes"
          className={inputCls}
          placeholder={t.checkout.notesPh}
          maxLength={500}
        />
      </div>
      <Btn type="submit" disabled={pending} className="w-full md:w-auto">
        {pending ? t.checkout.ordering : t.checkout.orderNow}
      </Btn>
    </form>
  );
}

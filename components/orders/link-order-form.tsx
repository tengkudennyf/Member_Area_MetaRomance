"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { linkOrderToUserAction } from "@/actions/orders";
import { Btn, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

// Admin: tautkan order tamu (email typo / beli dengan email lain) ke akun member.
// Hanya untuk order PAID tanpa pemilik.
export default function LinkOrderForm({
  orderId,
  guestEmail,
}: {
  orderId: string;
  guestEmail: string | null;
}) {
  const { toast } = useToast();
  const [state, action] = useActionState(linkOrderToUserAction, { ok: false });
  const [pending, start] = useTransition();
  const [email, setEmail] = useState(guestEmail ?? "");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) {
      setDone(true);
      toast("ok", "Order ditautkan ke akun.");
    }
  }, [state, toast]);

  if (done) return <p className="text-success text-[13px]">✔ Sudah ditautkan.</p>;

  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("orderId", orderId);
        fd.set("email", email);
        start(() => action(fd));
      }}
    >
      <div className="flex-1">
        <Field label="Email akun member">
          <input
            className={inputCls}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
          />
        </Field>
      </div>
      <Btn type="submit" disabled={pending} className="sm:self-end">
        {pending ? "Menautkan…" : "Tautkan"}
      </Btn>
    </form>
  );
}

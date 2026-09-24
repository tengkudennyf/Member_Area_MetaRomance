"use client";

import { useActionState, useEffect, useTransition } from "react";
import { addParticipantAction, cancelParticipantAction } from "@/actions/events";
import { Btn, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

export function AddParticipant({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const [state, action] = useActionState(addParticipantAction.bind(null, eventId), { ok: false });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", "Peserta ditambahkan.");
  }, [state, toast]);

  return (
    <form
      className="flex flex-wrap gap-2 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => action(new FormData(e.currentTarget)));
      }}
    >
      <div className="flex-1 min-w-52">
        <Field label="Email user terdaftar">
          <input
            name="email"
            type="email"
            className={inputCls}
            placeholder="nama@email.com"
            required
          />
        </Field>
      </div>
      <Btn type="submit" disabled={pending}>
        + Tambah manual
      </Btn>
    </form>
  );
}

export function CancelParticipant({ regId, eventId }: { regId: string; eventId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(() => {
          void cancelParticipantAction(regId, eventId);
        })
      }
      className="text-danger text-[12px] hover:underline disabled:opacity-50"
    >
      Cancel
    </button>
  );
}

"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { uploadProofAction } from "@/actions/orders";
import { Btn, labelCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/components/lang-provider";

export default function ProofUpload({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const { t } = useLang();
  const [state, action] = useActionState(uploadProofAction.bind(null, orderId), { ok: false });
  const [pending, start] = useTransition();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", t.proof.success);
  }, [state, toast, t]);

  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);
        const file = (e.currentTarget.elements.namedItem("proof") as HTMLInputElement | null)?.files?.[0];
        // Pra-validasi di browser: file >5MB DITOLAK di sini dengan pesan jelas,
        // jangan sampai dikirim (server juga menolak >5MB via MAX_PROOF).
        if (!file) {
          setLocalError(t.proof.noFile);
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setLocalError(t.proof.tooBig.replace("{size}", (file.size / 1048576).toFixed(1)));
          return;
        }
        start(() => action(new FormData(e.currentTarget)));
      }}
    >
      <p className={labelCls}>{t.proof.title} (JPG / PNG / PDF ≤5MB)</p>
      <input
        type="file"
        name="proof"
        accept=".jpg,.jpeg,.png,.pdf"
        className="text-[13px] text-faint mb-3"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? null)}
      />
      {name && <p className="text-accent text-[13px] mb-3">{t.proof.selected}{name}</p>}
      {localError && (
        <p role="alert" className="text-danger text-[13px] mb-3">
          {localError}
        </p>
      )}
      <Btn type="submit" disabled={pending || !name}>
        {pending ? t.proof.uploading : t.proof.upload}
      </Btn>
    </form>
  );
}

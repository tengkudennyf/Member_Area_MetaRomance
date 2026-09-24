"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { verifyAction } from "@/actions/orders";
import { Btn, Confirm, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

export default function VerifyPanel({
  orderId,
  orderNumber,
  hasProof = true,
}: {
  orderId: string;
  orderNumber: string;
  /** false = order masih PENDING tanpa bukti (approve manual via WhatsApp). */
  hasProof?: boolean;
}) {
  const { toast } = useToast();
  const [state, action] = useActionState(verifyAction, { ok: false });
  const [pending, start] = useTransition();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", `Order ${orderNumber} diproses.`);
  }, [state, toast, orderNumber]);

  const submit = (verdict: "APPROVED" | "REJECTED") => {
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("verdict", verdict);
    if (verdict === "REJECTED") fd.set("rejection_reason", reason);
    start(() => action(fd));
  };

  return (
    <div>
      {!hasProof && (
        <p className="text-warning text-[12px] mb-3">
          Belum ada bukti terupload — approve manual hanya bila pembayaran sudah dikonfirmasi
          via WhatsApp.
        </p>
      )}
      <Field label="Alasan penolakan (wajib bila Reject)">
        <input
          className={inputCls}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="cth: bukti buram / nominal tidak sesuai"
          disabled={!hasProof}
        />
      </Field>
      <div className="flex flex-wrap gap-2 mt-3">
        <Btn disabled={pending} onClick={() => setConfirmApprove(true)}>
          Approve Payment
        </Btn>
        {hasProof && (
          <Btn
            variant="danger"
            disabled={pending || !reason.trim()}
            onClick={() => submit("REJECTED")}
          >
            Reject
          </Btn>
        )}
      </div>
      <Confirm
        open={confirmApprove}
        title={`Approve ${orderNumber}?`}
        desc={
          hasProof
            ? "Order jadi PAID, akses produk/registrasi event dibuat otomatis, user dinotifikasi + email."
            : "Approve MANUAL tanpa bukti — pastikan user sudah bayar (cek WhatsApp). Order jadi PAID, akses dibuat otomatis."
        }
        confirmLabel="Ya, approve"
        onConfirm={() => {
          setConfirmApprove(false);
          submit("APPROVED");
        }}
        onCancel={() => setConfirmApprove(false)}
      />
    </div>
  );
}

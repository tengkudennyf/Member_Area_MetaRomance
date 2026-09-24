"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { uploadProductAsset } from "@/actions/products";
import { Btn, labelCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

const MAX_BYTES = { cover: 5 * 1024 * 1024, file: 50 * 1024 * 1024 } as const;

function UploadBox({
  productId,
  kind,
  title,
  hint,
  accept,
}: {
  productId: string;
  kind: "cover" | "file";
  title: string;
  hint: string;
  accept: string;
}) {
  const { toast } = useToast();
  const [state, action] = useActionState(uploadProductAsset.bind(null, productId), { ok: false });
  const [pending, start] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (state.error) toast("err", state.error);
    if (state.ok) toast("ok", `${title} terupload.`);
  }, [state, toast, title]);

  return (
    <form
      className="border border-dashed border-border rounded-2xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);
        const file = (e.currentTarget.elements.namedItem("asset") as HTMLInputElement | null)?.files?.[0];
        if (!file || file.size === 0) {
          setLocalError("Pilih file dulu.");
          return;
        }
        if (file.size > MAX_BYTES[kind]) {
          setLocalError(
            `File ${(file.size / 1048576).toFixed(1)}MB — maksimal ${kind === "cover" ? "5MB" : "50MB"}.`
          );
          return;
        }
        const fd = new FormData(e.currentTarget);
        fd.set("kind", kind);
        start(() => action(fd));
      }}
    >
      <p className={labelCls}>{title}</p>
      <p className="text-faint text-[12px] mb-3">{hint}</p>
      <input type="file" name="asset" accept={accept} className="text-[13px] text-faint mb-3" />
      {localError && (
        <p role="alert" className="text-danger text-[13px] mb-3">
          {localError}
        </p>
      )}
      <div>
        <Btn type="submit" variant="ghost" disabled={pending}>
          {pending ? "Mengupload…" : "Upload"}
        </Btn>
      </div>
    </form>
  );
}

export default function AssetUpload({ productId }: { productId: string }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <UploadBox
        productId={productId}
        kind="cover"
        title="Cover"
        hint="Gambar ≤5MB"
        accept="image/*"
      />
      <UploadBox
        productId={productId}
        kind="file"
        title="Product file"
        hint="PDF · Max 50 MB"
        accept="application/pdf"
      />
    </div>
  );
}

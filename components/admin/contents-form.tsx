"use client";

import { useActionState, useEffect, useTransition } from "react";
import { upsertContentAction } from "@/actions/contents";
import { Btn, Card, Field, inputCls } from "@/components/ui/kit";
import { useToast } from "@/components/ui/toast";

export default function ContentForm({
  contentKey,
  label,
  status,
  dataJson,
}: {
  contentKey: string;
  label: string;
  status: string;
  dataJson: string;
}) {
  const { toast } = useToast();
  const action = upsertContentAction.bind(null, contentKey);
  const [state, dispatch] = useActionState(action, { ok: false });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (state.error) toast("err", state.error);
  }, [state.error, toast]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => dispatch(fd));
      }}
      className="space-y-4 max-w-3xl"
    >
      <Card>
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">
          {contentKey}
        </p>
        <div className="space-y-3">
          <Field label="Label">
            <input name="label" className={inputCls} defaultValue={label} />
          </Field>
          <Field label="Status (DRAFT = disembunyikan dari front)">
            <select name="status" className={inputCls} defaultValue={status}>
              <option value="PUBLISHED">PUBLISHED — tampil di front</option>
              <option value="DRAFT">DRAFT — disembunyikan</option>
            </select>
          </Field>
          <Field label="Data JSON (object)">
            <textarea
              name="data"
              className={`${inputCls} font-mono !text-[12px] leading-relaxed`}
              rows={18}
              defaultValue={dataJson}
              spellCheck={false}
            />
          </Field>
        </div>
      </Card>
      <div className="flex gap-2">
        <Btn type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan & Publish ke Front"}
        </Btn>
        <Btn variant="ghost" href="/admin/contents">
          Kembali
        </Btn>
      </div>
      <p className="text-faint text-[12px]">
        Tips: edit value saja, jangan ubah nama key. Format harus JSON object valid.
        Perubahan tampil di front maksimal ~1 menit (cache).
      </p>
    </form>
  );
}

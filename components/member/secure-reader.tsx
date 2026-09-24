"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize } from "lucide-react"; import { useLang } from "@/components/lang-provider";

// Pembaca PDF anti-bajak level browser (deterrence, BUKAN DRM penuh):
// - iframe PDF dengan toolbar browser disembunyikan (#toolbar=0) + sandbox
//   TANPA allow-downloads → tombol download/save bawaan tidak ada.
// - Klik kanan, seleksi teks, Ctrl+P/S/C diblokir di area baca.
// - Watermark email user (jejak bila bocor via screenshot).
// - Cetak halaman disembunyikan via CSS print (.reader-secure).
// Catatan jujur: screenshot OS tidak bisa dicegah dari web. Watermark =
// penanda + efek gentar.
export default function SecureReader({
  src,
  title,
  watermark,
}: {
  src: string;
  title: string;
  watermark: string;
}) {
  const { t } = useLang();
  const boxRef = useRef<HTMLDivElement>(null);
  const [frameKey, setFrameKey] = useState(0);

  const blockKeys = useCallback((e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (
      (e.ctrlKey || e.metaKey) &&
      (k === "p" || k === "s" || k === "c" || k === "x")
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const noMenu = (e: MouseEvent) => e.preventDefault();
    const noSelect = () => false;
    box.addEventListener("contextmenu", noMenu);
    document.addEventListener("keydown", blockKeys, true);
    document.addEventListener("selectstart", noSelect);
    return () => {
      box.removeEventListener("contextmenu", noMenu);
      document.removeEventListener("keydown", blockKeys, true);
      document.removeEventListener("selectstart", noSelect);
    };
  }, [blockKeys]);

  const fullscreen = () => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => setFrameKey((k) => k + 1));
  };

  return (
    <div>
      <div
        ref={boxRef}
        className="reader-secure relative select-none bg-background"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <iframe
          key={frameKey}
          src={`${src}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full h-[78vh] rounded-xl border border-border bg-background"
          title={t.reader.readTitle.replace("{title}", title)}
          // allow-scripts: PDF internal viewer jalan; TANPA allow-downloads/
          // allow-modals → browser blokir unduhan & dialog cetak dari frame.
          sandbox="allow-scripts allow-same-origin"
        />
        {/* Watermark email — pointer-events none agar tidak ganggu baca */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        >
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="flex justify-around mt-[12%]">
              {[0, 1].map((c) => (
                <span
                  key={c}
                  className="text-foreground/15 text-[13px] font-medium rotate-[-18deg] whitespace-nowrap text-center leading-relaxed"
                >
                  ✦ META ROMANCE ✦<br />
                  {watermark}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 px-1 pb-1 items-center">
        <button
          type="button"
          onClick={fullscreen}
          className="inline-flex items-center gap-2 text-[13px] border border-border rounded-xl px-4 py-2.5 text-faint hover:text-accent hover:border-accent transition"
        >
          <Maximize size={15} /> {t.reader.fullscreen}
        </button>
        <span className="text-faint text-[12px] ml-1">
          {t.reader.readOnly}</span>
      </div>
      {/* Pengganti isi saat user mencoba print */}
      <div className="print-only hidden">
        <p>
          {t.reader.noPrint}
        </p>
      </div>
    </div>
  );
}






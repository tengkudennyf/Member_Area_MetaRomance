"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useLang } from "@/components/lang-provider";

// Tombol salin nomor rekening di halaman payment member.
// Client component karena pakai Clipboard API + state "Tersalin!".
export default function CopyRekeningButton({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();

  async function copy() {
    const text = number.replace(/\s+/g, "");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Salin nomor rekening"
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium border rounded-full px-3 py-1 transition ${
        copied
          ? "border-accent bg-accent text-on-accent"
          : "border-border text-faint hover:text-accent hover:border-accent"
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? t.proof.copied : t.proof.copy}
    </button>
  );
}

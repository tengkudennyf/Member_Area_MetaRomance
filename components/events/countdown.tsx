"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/lang-provider";

// Countdown §4 Member (client interactivity).
export default function Countdown({ target }: { target: string }) {
  const { t } = useLang();
  const calc = () => {
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(h)} : ${p(m)} : ${p(s)}`;
  };
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    setLeft(calc());
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (left === null)
    return <p className="text-faint text-[13px]">{t.eventDetail.liveEnded}</p>;
  return <p className="font-display text-[30px] tracking-widest text-accent">{left}</p>;
}

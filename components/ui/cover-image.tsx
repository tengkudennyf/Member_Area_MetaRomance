"use client";

import { useState } from "react";
import { eventCoverUrl, productCoverUrl } from "@/lib/utils/cover";

// Gambar cover dengan fallback placeholder bila path kosong / file hilang
// di storage. Satu komponen untuk store, library, dan admin.
export default function CoverImage({
  bucket,
  path,
  title,
  ratio = "aspect-[4/3]",
  className = "",
}: {
  bucket: "product-covers" | "event-covers";
  path: string | null;
  title: string;
  ratio?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = bucket === "product-covers" ? productCoverUrl(path) : eventCoverUrl(path);
  if (!url || failed) {
    return (
      <div
        className={`${ratio} rounded-xl bg-background border border-border flex items-center justify-center ${className}`}
        aria-label={title}
        role="img"
      >
        <span className="font-display text-[24px] text-accent/70">✦</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${ratio} rounded-xl border border-border object-cover w-full bg-background ${className}`}
    />
  );
}

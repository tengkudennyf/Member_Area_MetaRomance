import { format } from "date-fns";
import { id } from "date-fns/locale";

export function rp(n: number): string {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

export function fmtDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: id });
  } catch {
    return iso;
  }
}

export function fmtDateTime(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy · HH:mm", { locale: id });
  } catch {
    return iso;
  }
}

export function orderNumber(): string {
  const d = format(new Date(), "yyyyMMdd");
  // S12: CSPRNG + 6 digit (100000-999999 = 900rb/hari) — Math.random() hanya
  // 9000 kemungkinan/hari dan predictable. Unik tetap dijamin DB (order_number unique).
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const r = ((buf[0] ?? 0) % 900000) + 100000;
  return `MR-${d}-${r}`;
}

// Normalisasi kontak support (cth "088129839123812" / "+62...") → digit wa.me.
export function normalizeWaNumber(contact: string): string {
  let d = String(contact ?? "").replace(/[^0-9]/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  return d;
}

// Link wa.me bantuan dengan pesan prefill (order + email).
// Return null bila kontak tidak valid agar UI fallback ke teks biasa.
export function waHelpLink(contact: string, message: string): string | null {
  const num = normalizeWaNumber(contact);
  if (num.length < 9) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export const ORDER_BADGE: Record<string, string> = {
  PENDING_PAYMENT: "border-warning/40 text-warning",
  WAITING_VERIFICATION: "border-accent/50 text-accent",
  PAID: "border-success/40 text-success",
  REJECTED: "border-danger/40 text-danger",
  CANCELLED: "border-border text-faint",
  REFUNDED: "border-border text-faint",
};

export const ORDER_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  WAITING_VERIFICATION: "Waiting Verification",
  PAID: "Paid",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

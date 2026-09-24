import { Resend } from "resend";
import { sendLocalSmtp } from "./smtp";

// §27 — Resend (produksi) + SMTP lokal/Mailpit (dev, tanpa API key).
// Template di /emails sebagai string HTML (tanpa dependensi react-email).
let warnedNoResend = false;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Production tanpa Resend = email konfirmasi/reset/approve DIAM-DIAM skip.
    // Teriak sekali di log agar ketahuan dari Vercel logs (lihat PRODUCTION-GO-LIVE Fase 2).
    if (process.env.NODE_ENV === "production" && !warnedNoResend) {
      warnedNoResend = true;
      console.warn("[email] RESEND_API_KEY kosong di production — semua email akan di-skip.");
    }
    return null;
  }
  return new Resend(key);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ skipped: boolean; error?: string; via?: string }> {
  const from = process.env.EMAIL_FROM ?? "Meta Romance <noreply@metaromance.com>";
  // B6: gagal kirim JANGAN diam — log + kembalikan error agar caller bisa
  // membuat notifikasi internal/admin dan menjadwalkan retry manual.
  try {
    const resend = client();
    if (resend) {
      const { error } = await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
      if (error) {
        console.error("[email] Resend gagal:", opts.to, opts.subject, error.message);
        return { skipped: false, error: error.message };
      }
      return { skipped: false, via: "resend" };
    }
    // Tanpa API key: dev lokal → lempar ke Mailpit (127.0.0.1:55325).
    // Production tanpa key → skip (tidak ada SMTP lokal di sana).
    if (process.env.NODE_ENV === "production") return { skipped: true };
    await sendLocalSmtp({ to: opts.to, subject: opts.subject, html: opts.html, from });
    return { skipped: false, via: "local" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Email gagal terkirim";
    console.error("[email] Exception:", opts.to, opts.subject, msg);
    return { skipped: false, error: msg };
  }
}

type Db = {
  from: (t: string) => { insert: (v: Record<string, any>) => PromiseLike<unknown> };
};

export async function notifyUser(
  supabase: Db,
  input: { user_id: string; type: string; title: string; message: string; href?: string }
): Promise<void> {
  // Dipanggil dari Server Actions dengan service client; insert best-effort.
  try {
    await supabase.from("notifications").insert({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
    });
  } catch {
    /* notifikasi gagal tidak boleh menggagalkan transaksi */
  }
}

/**
 * B6: panggil setelah sendEmail bila hasilnya error — catat notifikasi
 * in-app untuk user/admin agar kegagalan email terlihat di dashboard.
 */
export async function notifyEmailFailure(
  supabase: Db,
  input: { user_id: string; subject: string; error: string }
): Promise<void> {
  await notifyUser(supabase, {
    user_id: input.user_id,
    type: "email_failed",
    title: "Notifikasi email gagal terkirim",
    message: `Email "${input.subject}" gagal terkirim (${input.error}). Cek manual / kirim ulang via admin.`,
  });
}

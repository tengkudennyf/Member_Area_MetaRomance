import { sendLocalSmtp } from "./smtp";

// §27 — Brevo Transactional API (produksi) + SMTP lokal/Mailpit
// (development tanpa API key).
// Template di /emails sebagai string HTML (tanpa dependensi react-email).
let warnedNoBrevo = false;

function brevoApiKey(): string | null {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    // Production tanpa Brevo = email transaksi aplikasi gagal dan dicatat.
    // Email Auth Supabase (konfirmasi/reset) memakai SMTP Brevo terpisah.
    // Teriak sekali di log agar ketahuan dari Vercel logs (lihat PRODUCTION-GO-LIVE Fase 2).
    if (process.env.NODE_ENV === "production" && !warnedNoBrevo) {
      warnedNoBrevo = true;
      console.warn("[email] BREVO_API_KEY kosong di production — email aplikasi akan gagal.");
    }
    return null;
  }
  return key;
}

function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);
  if (!match) return { email: from.trim() };
  const name = match[1]?.trim().replace(/^(["'])(.*)\1$/, "$2");
  return name ? { name, email: match[2]! } : { email: match[2]! };
}

type BrevoResponse = {
  messageId?: string;
  code?: string;
  message?: string;
};

async function sendViaBrevo(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": opts.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(opts.from),
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      tags: ["meta-romance-transactional"],
    }),
  });

  const payload = (await response.json().catch(() => null)) as BrevoResponse | null;
  if (!response.ok || !payload?.messageId) {
    const detail = payload?.message ?? payload?.code ?? `HTTP ${response.status}`;
    throw new Error(`Brevo menolak email: ${detail}`);
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ skipped: boolean; error?: string; via?: string }> {
  const from = process.env.EMAIL_FROM ?? "Meta Romance <noreply@metaromance.web.id>";
  // B6: gagal kirim JANGAN diam — log + kembalikan error agar caller bisa
  // membuat notifikasi internal/admin dan menjadwalkan retry manual.
  try {
    const apiKey = brevoApiKey();
    if (apiKey) {
      await sendViaBrevo({ apiKey, from, to: opts.to, subject: opts.subject, html: opts.html });
      return { skipped: false, via: "brevo" };
    }
    // Tanpa API key: dev lokal → lempar ke Mailpit (127.0.0.1:55325).
    // Production tanpa key → laporkan error agar caller membuat notifikasi internal.
    if (process.env.NODE_ENV === "production") {
      return { skipped: true, error: "BREVO_API_KEY belum dikonfigurasi" };
    }
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


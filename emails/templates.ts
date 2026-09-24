// S7: SEMUA input dinamis di-escape sebelum masuk HTML email.
// Mencegah HTML injection / stored XSS via email client (tracking pixel <img>,
// link phishing <a>, CSS background:url) dari: nama user, judul produk/event,
// order number, rejection reason (input admin), URL.
// URL hanya boleh http(s) — javascript:/data: ditolak.

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL aman untuk atribut href — tolak scheme selain http/https. */
export function safeHref(url: string): string {
  const u = String(url ?? "").trim();
  if (!/^https?:\/\//i.test(u)) return "#";
  return escapeHtml(u);
}

export function baseLayout(title: string, body: string, cta: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#202940">
<h2>${title}</h2><p>${body}</p><p>${cta}</p>
<p style="color:#9A8678;font-size:12px">Meta Romance Member Area</p></div>`;
}

export const tpl = {
  welcome: (name: string, link: string) => ({
    subject: "Selamat datang di Meta Romance Member Area",
    html: baseLayout(
      `Halo ${escapeHtml(name)},`,
      "Akun Anda dibuat. Kami mengirim email terpisah berisi link konfirmasi — klik link itu untuk mengaktifkan akun, lalu login.",
      `<a href="${safeHref(link)}">Ke halaman login</a>`
    ),
  }),
  paymentSubmitted: (order: string) => ({
    subject: `Bukti pembayaran ${escapeHtml(order)} diterima`,
    html: baseLayout(
      "Bukti diterima",
      `Order <b>${escapeHtml(order)}</b> menunggu verifikasi admin (maks 1x24 jam).`,
      ""
    ),
  }),
  paymentApproved: (order: string, href: string) => ({
    subject: `Pembayaran ${escapeHtml(order)} disetujui`,
    html: baseLayout(
      "Pembayaran disetujui",
      `Akses produk Anda sudah dibuka.`,
      `<a href="${safeHref(href)}">Buka Library</a>`
    ),
  }),
  paymentRejected: (order: string, reason: string) => ({
    subject: `Pembayaran ${escapeHtml(order)} perlu perhatian`,
    html: baseLayout(
      "Verifikasi belum berhasil",
      `Alasan: ${escapeHtml(reason || "-")}. Silakan upload ulang bukti yang valid.`,
      ""
    ),
  }),
  accessGranted: (title: string, href: string) => ({
    subject: `Akses dibuka: ${escapeHtml(title)}`,
    html: baseLayout(
      "Akses dibuka",
      `Produk <b>${escapeHtml(title)}</b> kini lifetime di Library Anda.`,
      `<a href="${safeHref(href)}">Buka produk</a>`
    ),
  }),
  eventConfirmed: (title: string, href: string) => ({
    subject: `Pendaftaran event: ${escapeHtml(title)}`,
    html: baseLayout(
      "Terdaftar",
      `Anda terdaftar di <b>${escapeHtml(title)}</b>. Link Join muncul di detail event.`,
      `<a href="${safeHref(href)}">Lihat event</a>`
    ),
  }),
  // Khusus TAMU event: link claim yang sama (masuk → event tertaut otomatis).
  guestEventApproved: (order: string, eventTitle: string, claimUrl: string) => ({
    subject: `Pendaftaran ${escapeHtml(order)} dikonfirmasi`,
    html: baseLayout(
      "Pendaftaran dikonfirmasi",
      `Order <b>${escapeHtml(order)}</b> lunas — Anda terdaftar di <b>${escapeHtml(eventTitle)}</b>. Klik tombol di bawah untuk melihat event di Member Area (daftar/login bila belum punya akun).`,
      `<a href="${safeHref(claimUrl)}">Klaim & lihat event →</a>`
    ),
  }),
  eventReminder: (title: string, href: string) => ({
    subject: `Pengingat: ${escapeHtml(title)} segera dimulai`,
    html: baseLayout(
      "Jangan lewatkan",
      `Event <b>${escapeHtml(title)}</b> segera dimulai. Siapkan koneksi terbaik Anda.`,
      `<a href="${safeHref(href)}">Join Event</a>`
    ),
  }),
  // Khusus TAMU (beli tanpa akun): LINK CLAIM — klik → member area
  // (login/daftar bila belum punya akun) → pembelian otomatis masuk Library.
  guestPaymentApproved: (order: string, claimUrl: string, titles: string[]) => {
    const list = titles
      .map((t) => `<p style="margin:8px 0">• <b>${escapeHtml(t)}</b></p>`)
      .join("");
    return {
      subject: `Pembayaran ${escapeHtml(order)} disetujui — klaim ebook Anda`,
      html: baseLayout(
        "Pembayaran disetujui",
        `Order <b>${escapeHtml(order)}</b> lunas. Klik tombol di bawah untuk membuka ebook di Member Area — belum punya akun? Bisa daftar atau login di sana dengan email ini.`,
        `${list}<p style="margin-top:16px"><a href="${safeHref(claimUrl)}">Klaim & buka ebook →</a></p>`
      ),
    };
  },
};

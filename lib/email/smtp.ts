import net from "net";

// Klien SMTP minimal TANPA dependensi — hanya untuk dev lokal
// (kirim email aplikasi ke Mailpit/Inbucket di 127.0.0.1:55325).
// Produksi tetap pakai Brevo Transactional API (lib/email/send.ts). Tidak ada TLS,
// tidak ada auth — JANGAN dipakai di production.

function encodeSubject(s: string): string {
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf-8").toString("base64")}?=`;
}

function stripAddr(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m?.[1] ?? from).trim();
}

export async function sendLocalSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  from: string;
  host?: string;
  port?: number;
}): Promise<void> {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 55325;
  const body = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    opts.html,
  ].join("\r\n");
  const fromAddr = stripAddr(opts.from);

  await new Promise<void>((resolve, reject) => {
    const sock = net.createConnection({ host, port });
    const done = (fn: () => void) => {
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error("SMTP timeout"));
    }, 10000);
    let buf = "";
    let step = 0;
    let settled = false;
    const send = (s: string) => sock.write(s + "\r\n");
    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      done(() => {
        sock.destroy();
        reject(new Error(msg));
      });
    };
    const ok = () => {
      if (settled) return;
      settled = true;
      done(() => {
        sock.end();
        resolve();
      });
    };
    const handle = (code: string) => {
      if (step === 0 && code === "220") {
        send("EHLO localhost");
      } else if (step === 0 && code === "250") {
        step = 1;
        send(`MAIL FROM:<${fromAddr}>`);
      } else if (step === 1 && (code === "250" || code === "251")) {
        step = 2;
        send(`RCPT TO:<${opts.to}>`);
      } else if (step === 2 && (code === "250" || code === "251")) {
        step = 3;
        send("DATA");
      } else if (step === 3 && code === "354") {
        step = 4;
        send(body + "\r\n.");
      } else if (step === 4 && code === "250") {
        step = 5;
        send("QUIT");
      } else if (step === 5) {
        ok();
      } else {
        fail(`SMTP step ${step} ditolak (${code})`);
      }
    };
    sock.on("connect", () => {
      // Tunggu greeting 220 dulu (step 0) — JANGAN kirim EHLO buta.
    });
    sock.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (/^\d{3}-/.test(line)) continue; // baris lanjutan multi-line
        const m = line.match(/^(\d{3}) /);
        if (m?.[1]) handle(m[1]);
      }
    });
    sock.on("error", (e) => fail(e.message));
  });
}

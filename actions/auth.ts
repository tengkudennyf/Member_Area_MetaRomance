"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  forgotSchema,
  loginSchema,
  passwordChangeSchema,
  profileSchema,
  registerSchema,
  resetSchema,
} from "@/lib/validations/schemas";
import { appUrl, safeNext } from "@/lib/auth/session";
import { getDictServer } from "@/lib/i18n/server";
import { sendEmail } from "@/lib/email/send";
import { takeAttempt } from "@/lib/api/rate-limit";
import { tpl } from "@/emails/templates";
import {
  isCodeFormatValid,
  normalizeCode,
  VERIFICATION_CODE_COOKIE,
} from "@/lib/auth/verification-code";

// Rate limit login (§6 Security, S3): Redis global bila UPSTASH_* diset,
// fallback in-memory per instance. Lihat lib/api/rate-limit.ts.

export type ActionResult = { ok: boolean; error?: string };

// Login Verification Code 5 huruf sementara pengganti Cloudflare Turnstile.
// Kode ekspektasi disimpan server-side di cookie httpOnly `lv_code`
// (di-set oleh GET /api/auth/challenge, expiry 5 menit, sekali pakai).
// Bandingkan case-insensitive. Hapus cookie setelah sukses (anti-replay).
// TODO(prod): hapus fungsi ini + kembalikan captchaToken saat balik ke Turnstile.
//   - actions: teruskan `options: { captchaToken }` ke signUp/signIn/resend/recovery
//   - supabase/config.toml: [auth.captcha] enabled=true
//   - form: ganti <VerificationCode> dengan <Turnstile> (components/auth/turnstile.tsx
//     sengaja TIDAK dihapus).
async function checkVerificationCode(form: FormData): Promise<string | null> {
  const { t: d } = await getDictServer();
  const input = normalizeCode(String(form.get("verificationCode") ?? ""));
  if (!input) return d.errors.codeFill;
  if (!isCodeFormatValid(input)) return d.errors.codeFormat;
  const store = await cookies();
  const expected = normalizeCode(store.get(VERIFICATION_CODE_COOKIE)?.value);
  if (!expected) return d.errors.codeExpired;
  if (input !== expected) return d.errors.codeWrong;
  // Sukses → bakar kode agar tidak bisa dipakai ulang.
  try {
    store.delete(VERIFICATION_CODE_COOKIE);
  } catch {
    /* abaikan — kegagalan hapus cookie tidak boleh menggagalkan auth */
  }
  return null;
}

export async function registerAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { t: d } = await getDictServer();
  const parsed = registerSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    password: form.get("password"),
    confirm: form.get("confirm"),
    verificationCode: form.get("verificationCode"),
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? d.errors.invalidInput };
  const codeErr = await checkVerificationCode(form);
  if (codeErr) return { ok: false, error: codeErr };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name, phone: parsed.data.phone },
      emailRedirectTo: `${appUrl()}/auth/confirm?next=/member`,
      // TODO(prod): kembalikan captchaToken saat balik ke Turnstile.
    },
  });
  if (error) return { ok: false, error: error.message };
  // Supabase tidak error untuk email yang SUDAH terdaftar (anti-enumeration):
  // user obfuskasi datang dengan identities kosong → tolak dengan jelas.
  if (data.user && (!data.user.identities || data.user.identities.length === 0))
    return { ok: false, error: d.errors.emailTaken };
  // Welcome email best-effort (§27.1). Link konfirmasi ASLI dikirim Supabase
  // via Brevo SMTP yang dikonfigurasi di Supabase — jangan buat token sendiri.
  const t = tpl.welcome(parsed.data.name, `${appUrl()}/login`);
  await sendEmail({ to: parsed.data.email, subject: t.subject, html: t.html });
  const next = safeNext(String(form.get("next") || ""), "");
  redirect(next ? `/login?registered=1&next=${encodeURIComponent(next)}` : "/login?registered=1");
}

// Kirim ulang link konfirmasi (untuk link kedaluwarsa/sudah dipakai).
// Aman dipanggil berkali-kali; GoTrue tidak membocorkan status akun.
export async function resendConfirmAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { t: d } = await getDictServer();
  const parsed = forgotSchema.safeParse({
    email: form.get("email"),
    verificationCode: form.get("verificationCode"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? d.errors.invalidInput };
  const codeErr = await checkVerificationCode(form);
  if (codeErr) return { ok: false, error: codeErr };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${appUrl()}/auth/confirm?next=/member` },
    // TODO(prod): kembalikan captchaToken saat balik ke Turnstile.
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Dipanggil setelah /auth/confirm menukar code jadi sesi (masuk tanpa lewat
// loginAction) — agar order tamu tetap tertaut.
export async function claimAfterConfirmAction(): Promise<{ claimed: number }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { claimed: 0 };
    const { createServiceClient } = await import("@/lib/supabase/service");
    const { claimGuestOrders } = await import("@/lib/orders/claim");
    const svc = createServiceClient();
    const { data: prof } = await svc
      .from("profiles")
      .select("id, email")
      .eq("auth_user_id", user.id)
      .single();
    const p = prof as { id: string; email: string } | null;
    if (!p) return { claimed: 0 };
    const r = await claimGuestOrders(svc, { profileId: p.id, email: p.email });
    return { claimed: r.claimed };
  } catch {
    return { claimed: 0 };
  }
}

export async function loginAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { t: d } = await getDictServer();
  const parsed = loginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    verificationCode: form.get("verificationCode"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? d.errors.invalidInput };
  if (!(await takeAttempt(`login:${parsed.data.email}`, 10, 60_000)))
    return { ok: false, error: d.errors.tooMany };
  const codeErr = await checkVerificationCode(form);
  if (codeErr) return { ok: false, error: codeErr };
  const supabase = await createClient();
  const {
    data: { user: signedIn },
    error,
  } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    // TODO(prod): kembalikan options: { captchaToken } saat balik ke Turnstile.
  });
  if (error) {
    // Confirm-email ON: user yang belum klik link ditolak di sini oleh GoTrue.
    if (/not confirmed|not verified|unverified|belum verifikasi/i.test(error.message))
      return { ok: false, error: d.errors.unverified };
    return { ok: false, error: d.errors.wrongCreds };
  }
  // Tautkan order TAMU (beli tanpa akun, email sama) ke akun ini — best-effort.
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const { claimGuestOrders } = await import("@/lib/orders/claim");
    const svc = createServiceClient();
    const { data: prof } = await svc
      .from("profiles")
      .select("id, email")
      .eq("auth_user_id", signedIn?.id ?? "")
      .single();
    const p = prof as { id: string; email: string } | null;
    if (p) await claimGuestOrders(svc, { profileId: p.id, email: p.email });
  } catch {
    /* klaim gagal tidak boleh menggagalkan login */
  }
  const next = safeNext(String(form.get("next") || ""), "/member");
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { t: d } = await getDictServer();
  const parsed = forgotSchema.safeParse({
    email: form.get("email"),
    verificationCode: form.get("verificationCode"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? d.errors.invalidInput };
  const codeErr = await checkVerificationCode(form);
  if (codeErr) return { ok: false, error: codeErr };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Lewat /auth/confirm agar code PKCE ditukar jadi sesi dulu —
    // /reset-password butuh sesi untuk updateUser.
    redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
    // TODO(prod): kembalikan captchaToken saat balik ke Turnstile.
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resetAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { t: d } = await getDictServer();
  const parsed = resetSchema.safeParse({
    password: form.get("password"),
    confirm: form.get("confirm"),
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? d.errors.invalidInput };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  redirect("/login?reset=1");
}

export async function changePasswordAction(
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const { t: d } = await getDictServer();
  const parsed = passwordChangeSchema.safeParse({
    current: form.get("current"),
    password: form.get("password"),
    confirm: form.get("confirm"),
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? d.errors.invalidInput };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "UNAUTHORIZED" };
  // Re-auth: pastikan yang mengganti benar pemilik akun.
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (authErr) return { ok: false, error: d.errors.wrongCurrent };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateProfileAction(
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  const { t: d } = await getDictServer();
  const parsed = profileSchema.safeParse({
    name: form.get("name"),
    phone: form.get("phone"),
  });
  if (!parsed.success) return { ok: false, error: d.errors.invalidInput };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHORIZED" };
  // Hanya kolom yang diizinkan — role/status tidak tersentuh (§1 Security)
  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

import { z } from "zod";

// §25 — Zod schemas dipakai client (RHF) + server (Actions). Server wajib
// validasi ulang; client validation bukan security boundary.
// Kode verifikasi 5 huruf sementara pengganti Turnstile (huruf+angka,
// tanpa O/0/I/1/L). Case-insensitive. Validasi kecocokan dilakukan
// server-side via cookie di actions/auth.ts.
// TODO(prod): hapus saat balik ke Turnstile.
export const verificationCodeSchema = z
  .string()
  .trim()
  .length(5, "Kode verifikasi 5 huruf")
  .regex(/^[A-HJ-NP-Z2-9]{5}$/i, "Kode verifikasi tidak valid");

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter").max(100),
    email: z.string().email("Email tidak valid"),
    phone: z.string().min(9, "No. WhatsApp tidak valid").max(20),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirm: z.string(),
    verificationCode: verificationCodeSchema,
  })
  .refine((v) => v.password === v.confirm, {
    message: "Confirm password tidak sama",
    path: ["confirm"],
  });

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  verificationCode: verificationCodeSchema,
});

export const forgotSchema = z.object({
  email: z.string().email("Email tidak valid"),
  verificationCode: verificationCodeSchema,
});

export const resetSchema = z
  .object({
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Confirm password tidak sama",
    path: ["confirm"],
  });

export const profileSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(9).max(20),
});

// Ganti password saat login: wajib tahu password lama (re-auth).
export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, "Password lama wajib diisi"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Confirm password tidak sama",
    path: ["confirm"],
  })
  .refine((v) => v.password !== v.current, {
    message: "Password baru harus beda dari yang lama",
    path: ["password"],
  });

export const productSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug: huruf kecil, angka, strip"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  pillar: z.enum([
    "5D_CONSCIOUSNESS",
    "ROMANCE_ATTRACTION",
    "FINANCIAL_CAREER",
    "MANIFESTATION_TOOLS",
  ]),
  product_type: z.enum(["EBOOK", "WORKBOOK", "JOURNAL", "GUIDE", "DIGITAL_MATERIAL"]),
  price: z.coerce.number().int().min(0),
  original_price: z.coerce.number().int().min(0).nullable().optional(),
  download_enabled: z.boolean().default(true),
  access_type: z.enum(["LIFETIME", "LIMITED"]).default("LIFETIME"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

// S4: minimal salah satu terisi — dienforce di schema (bukan cuma guard manual).
export const checkoutSchema = z
  .object({
    productId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => v.productId || v.eventId, {
    message: "Pilih produk atau event",
    path: ["productId"],
  });

export const eventSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug: huruf kecil, angka, strip"),
  description: z.string().min(10),
  pillar: z.enum([
    "5D_CONSCIOUSNESS",
    "ROMANCE_ATTRACTION",
    "FINANCIAL_CAREER",
    "MANIFESTATION_TOOLS",
  ]),
  event_type: z.enum(["WEBINAR", "WORKSHOP", "CLASS", "SPECIAL_SESSION"]),
  platform: z.enum(["ZOOM", "GOOGLE_MEET", "YOUTUBE", "OTHER"]),
  meeting_url: z.string().url("URL tidak valid").or(z.literal("")).optional(),
  start_at: z.string().min(1, "Waktu mulai wajib diisi"),
  end_at: z.string().min(1, "Waktu selesai wajib diisi"),
  price: z.coerce.number().int().min(0),
  quota: z.coerce.number().int().min(0).nullable().optional(),
  status: z
    .enum(["DRAFT", "PUBLISHED", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"])
    .default("DRAFT"),
});

export const verifySchema = z.object({
  orderId: z.string().uuid(),
  verdict: z.enum(["APPROVED", "REJECTED"]),
  rejection_reason: z.string().max(500).optional(),
});

export const manualAccessSchema = z.object({
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  reason: z.string().max(300).optional(),
});

// Satu rekening bank: Bank + nomor + atas nama. Disimpan sebagai array
// JSON di key `bank_account` (kompatibel: kode lama baca string tunggal).
export const bankAccountSchema = z.object({
  bank: z.string().trim().min(2, "Nama bank wajib diisi").max(60),
  number: z.string().trim().min(3, "Nomor rekening wajib diisi").max(30),
  name: z.string().trim().min(2, "Atas nama wajib diisi").max(100),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;

export const settingsSchema = z.object({
  bank_account: z.array(bankAccountSchema).min(1, "Minimal 1 rekening bank").max(10, "Maksimal 10 rekening"),
  support_contact: z.string().min(3),
  payment_instruction: z.string().min(10),
  event_join_window: z.string().min(1),
  download_policy: z.string().min(1),
});

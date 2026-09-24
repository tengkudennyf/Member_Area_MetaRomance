# Security Audit — MVP (§6 Security)

| Item plan                          | Status | Bukti                                                                                                                            |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| RLS audit                          | ✅     | `0001_init.sql`: RLS on 10 tabel; user hanya own rows; products/events published readable; settings read-only                    |
| Role tidak bisa diset dari browser | ✅     | Trigger `lock_role_change` + update profile hanya `name/phone` (`actions/auth.ts`)                                               |
| Storage access audit               | ✅     | `payment-proofs` + `product-files` privat tanpa policy baca; covers publik saja; avatars own-folder                              |
| Admin authorization audit          | ✅     | `requireAdmin` di semua Server Actions admin + semua halaman `/admin` redirect non-admin; middleware lapis 1                     |
| File validation                    | ✅     | Produk: PDF saja; cover: image; bukti: JPG/PNG/PDF — cek MIME + ekstensi server-side                                             |
| Upload limit                       | ✅     | PDF 50MB, cover 5MB, bukti 5MB, avatar implisit                                                                                  |
| Service role isolation             | ✅     | `lib/supabase/service.ts` hanya diimpor file server (`actions/*`, `api/*`, halaman admin server) — tidak ada di Client Component |
| Login rate limit                   | ✅     | In-memory 10x/menit per email (`actions/auth.ts`);TODO multi-instance → Upstash                                                  |
| CSRF / action review               | ✅     | Server Actions Next.js (origin check bawaan) + Zod server-side di semua aksi                                                     |
| IDOR                               | ✅     | Semua baca detail cek ownership (`order.user_id`, `access.user_id`, notif `user_id`); file via `/api/files` cek ACTIVE           |
| Signed URL expiration              | ✅     | 900 detik (15 mnt) untuk file produk + bukti admin                                                                               |
| Input sanitization                 | ✅     | Zod semua input; nama file disanitasi `[^a-zA-Z0-9.-]`; slug regex                                                               |
| Password hash                      | ✅     | Supabase Auth (bcrypt server-side) — plaintext tidak pernah disimpan                                                             |
| Secrets                            | ✅     | Service role + Resend hanya `process.env` server; `.env.example` tanpa nilai asli                                                |

Catatan: rate limit in-memory reset saat restart & per-instance — cukup untuk
MVP single-instance Vercel; naikkan ke Redis saat Phase 7+.

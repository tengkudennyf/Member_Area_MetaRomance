# QA Scenarios — MVP (§6 + Acceptance §38)

Jalankan berurutan di staging. Tandai PASS/FAIL.

## Test A — Digital Product (§38)

- [ ] Create User (register → verifikasi email → login) — PASS
- [ ] Create Product (admin new → upload PDF → publish) — PASS
- [ ] Checkout (ringkasan + snapshot + order number unik) — PASS
- [ ] Upload Payment Proof (privat, status WAITING) — PASS
- [ ] Admin Verification (approve → PAID; klik ganda tidak duplikat akses) — PASS
- [ ] Access Created (product_access ACTIVE, notif + email) — PASS
- [ ] Private Product Opened (iframe via /api/files, download bila allowed) — PASS

## Test B — Event (§38)

- [ ] Create Event (publish, kuota, meeting URL) — PASS
- [ ] Buy Event (checkout event, cegah duplikat registrasi, kuota) — PASS
- [ ] Payment Approved → Registration Created — PASS
- [ ] Event Appears (Upcoming/Past, featured next event) — PASS
- [ ] Meeting URL Protected (hanya peserta REGISTERED) — PASS

## Test C — Authorization (§38)

- [ ] User cannot open admin (redirect /member) — PASS
- [ ] User cannot open another user's order (IDOR) — PASS
- [ ] User cannot open unowned product (locked) — PASS
- [ ] Public cannot open private file (/api/files 401/403) — PASS

## User flows (§6)

- [ ] Register / Login / Forgot / Reset password — PASS
- [ ] Purchase / Upload proof / View order / Open product / Join event — PASS

## Admin flows (§6)

- [ ] Create product / Approve / Reject+reason / Grant / Revoke / Create event / Manage participant — PASS

## UX (§6)

- [ ] Skeleton loading / Empty states / Toast / Confirm dialogs / 404 / Global error / Form errors (RHF+Zod) / Responsive 360px + desktop — PASS

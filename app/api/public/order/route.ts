import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isDemoMode } from "@/lib/supabase/env";
import { orderNumber } from "@/lib/utils/format";
import { cors, preflight, denyDisallowedOrigin, isEmail } from "@/lib/api/cors";
import { rateLimit, withRateHeaders } from "@/lib/api/rate-limit";

// Guest checkout dari website utama (tanpa login).
// POST /api/public/order { kind: "product"|"event", id, guest_name, guest_email, guest_phone?, notes? }
//   → 1 item, 1 order (kompatibel lama).
// POST /api/public/order { items: [{kind, id}, ...], guest_*, notes? }
//   → multi item (maks 10, duplikat dibuang), 1 order gabungan,
//     1 total, 1 transfer, 1 upload bukti. Dipakai troli Front End.
// → { order_id, order_number, total }
// GET /api/public/order?order_number=MR-..&email=x@y.z → status order (email harus cocok).

export async function OPTIONS(req: Request): Promise<NextResponse> {
  return preflight(req);
}

type ItemInput = { kind?: string; id?: string };

type CheckoutBody = {
  kind?: string;
  id?: string;
  /** Multi-item (troli): [{kind, id}]. Jika diisi, kind/id tunggal diabaikan. */
  items?: ItemInput[];
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  notes?: string;
};

type ValidItem = {
  itemType: "PRODUCT" | "EVENT";
  productId: string | null;
  eventId: string | null;
  title: string;
  price: number;
};

export async function POST(req: Request): Promise<NextResponse> {
  const denied = denyDisallowedOrigin(req);
  if (denied) return denied;
  const limited = await rateLimit(req, "orderCreate");
  if (limited) return cors(limited, req);

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return cors(NextResponse.json({ error: "Body harus JSON." }, { status: 400 }), req);
  }
  const name = String(body.guest_name ?? "").trim();
  const email = String(body.guest_email ?? "").trim().toLowerCase();
  const phone = String(body.guest_phone ?? "").trim();
  const notes = String(body.notes ?? "").trim().slice(0, 500);

  if (name.length < 2) return cors(NextResponse.json({ error: "Nama minimal 2 karakter." }, { status: 400 }), req);
  if (!isEmail(email)) return cors(NextResponse.json({ error: "Email tidak valid." }, { status: 400 }), req);
  if (phone.length < 9 || phone.length > 20)
    return cors(NextResponse.json({ error: "No. WhatsApp tidak valid." }, { status: 400 }), req);
  // Daftar item: mode troli (items[]) atau mode satuan (kind/id, kompatibel lama).
  let rawItems: ItemInput[];
  if (Array.isArray(body.items) && body.items.length > 0) {
    rawItems = body.items;
  } else if (body.id && (body.kind === "product" || body.kind === "event")) {
    rawItems = [{ kind: body.kind, id: body.id }];
  } else {
    return cors(NextResponse.json({ error: "Produk/event tidak valid." }, { status: 400 }), req);
  }
  // Buang duplikat dalam request yang sama, batasi 10 item.
  const seen = new Set<string>();
  const reqItems = rawItems.filter((it) => {
    const k = `${it?.kind}:${it?.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (reqItems.length === 0 || reqItems.length > 10)
    return cors(NextResponse.json({ error: "Jumlah item tidak valid (maks 10)." }, { status: 400 }), req);
  for (const it of reqItems) {
    if (!it?.id || (it.kind !== "product" && it.kind !== "event"))
      return cors(NextResponse.json({ error: "Produk/event tidak valid." }, { status: 400 }), req);
  }

  if (isDemoMode()) {
    return cors(
      NextResponse.json({ error: "Checkout website butuh Supabase (saat ini mode demo)." }, { status: 503 }),
      req
    );
  }

  const svc = createServiceClient();

  // Cleanup malas GLOBAL (S11): hapus SEMUA order tamu basi yang tidak lanjut
  // bayar >30 menit — tidak dibatasi email pemesan, agar tabel tidak membengkak
  // oleh spam dari banyak email berbeda. Dijalankan tiap ada order masuk (1
  // query select + maksimal 1 delete), tanpa cron/trigger.
  // Syarat SEMUA: user_id NULL (guest front end — order member login tidak
  // disentuh), PENDING_PAYMENT, created_at >30 mnt, dan belum ada bukti
  // (payment PENDING tanpa proof_path). Order yang sudah upload bukti
  // (WAITING_VERIFICATION) atau lunas tidak pernah dihapus.
  // Hapus via `orders` saja — order_items + payments ikut cascade.
  // S17: guest orders (user_id NULL) memang tak ter-cover policy RLS "orders own"
  // — by design hanya service role (API ini) yang boleh baca/tulis.
  const staleCutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data: stale } = await svc
    .from("orders")
    .select("id, payments!inner(status, proof_path)")
    .is("user_id", null)
    .eq("status", "PENDING_PAYMENT")
    .lt("created_at", staleCutoff)
    .limit(200);
  const staleIds = (
    (stale ?? []) as {
      id: string;
      payments: { status: string; proof_path: string | null }[];
    }[]
  )
    .filter((o) => (o.payments ?? []).every((p) => p.status === "PENDING" && !p.proof_path))
    .map((o) => o.id);
  if (staleIds.length > 0) {
    await svc.from("orders").delete().in("id", staleIds);
  }

  const validItems: ValidItem[] = [];

  for (const it of reqItems) {
    const kind = it.kind as "product" | "event";
    const id = String(it.id);
    if (kind === "product") {
      const { data: p } = await svc
        .from("products")
        .select("id, title, price, status")
        .eq("id", id)
        .single();
      if (!p || (p as { status: string }).status !== "PUBLISHED")
        return cors(NextResponse.json({ error: "Produk tidak tersedia." }, { status: 404 }), req);
      validItems.push({
        itemType: "PRODUCT",
        productId: (p as { id: string }).id,
        eventId: null,
        title: (p as { title: string }).title,
        price: (p as { price: number }).price,
      });
    } else {
      const { data: e } = await svc
        .from("events")
        .select("id, title, price, status, quota")
        .eq("id", id)
        .single();
      const ev = e as { id: string; title: string; price: number; status: string; quota: number | null } | null;
      if (!ev || !["PUBLISHED", "UPCOMING"].includes(ev.status))
        return cors(NextResponse.json({ error: "Event tidak tersedia." }, { status: 404 }), req);
      if (ev.quota != null) {
        const { count } = await svc
          .from("event_registrations")
          .select("id", { count: "exact" })
          .eq("event_id", ev.id)
          .eq("status", "REGISTERED");
        if ((count ?? 0) >= ev.quota)
          return cors(NextResponse.json({ error: "Kuota event penuh." }, { status: 409 }), req);
      }
      validItems.push({
        itemType: "EVENT",
        productId: null,
        eventId: ev.id,
        title: ev.title,
        price: ev.price,
      });
    }
  }

  // Cegah order ganda aktif untuk email + item yang sama (cek semua item).
  const { data: dup } = await svc
    .from("orders")
    .select("id, order_items!inner(product_id, event_id)")
    .eq("guest_email", email)
    .in("status", ["PENDING_PAYMENT", "WAITING_VERIFICATION", "PAID"]);
  const dupList = (dup ?? []) as { order_items: { product_id: string | null; event_id: string | null }[] }[];
  const owned = new Set<string>();
  for (const o of dupList)
    for (const i of o.order_items ?? []) {
      if (i.product_id) owned.add(`product:${i.product_id}`);
      if (i.event_id) owned.add(`event:${i.event_id}`);
    }
  const dupItem = validItems.find((v) =>
    owned.has(v.itemType === "PRODUCT" ? `product:${v.productId}` : `event:${v.eventId}`)
  );
  if (dupItem)
    return cors(
      NextResponse.json(
        { error: `Email ini sudah memesan "${dupItem.title}". Cek status order Anda.` },
        { status: 409 }
      ),
      req
    );

  const total = validItems.reduce((s, v) => s + v.price, 0);

  // S2: idempotency key — email + set item terurut. Double-click / retry
  // concurrent dengan isi sama menabrak partial unique index → resume order
  // lama (bukan 500). Order REJECTED/CANCELLED tak ikut index → boleh pesan ulang.
  const dedupeKey =
    `g:${email}|` +
    validItems
      .map((v) => `${v.itemType === "PRODUCT" ? "product" : "event"}:${v.productId ?? v.eventId}`)
      .sort()
      .join(",");

  let orderId = "";
  let orderNo = "";
  let resumed: { id: string; order_number: string; total: number } | null = null;
  for (let i = 0; i < 3 && !orderId && !resumed; i += 1) {
    orderNo = orderNumber();
    const { data, error } = await svc
      .from("orders")
      .insert({
        order_number: orderNo,
        user_id: null,
        guest_name: name,
        guest_email: email,
        guest_phone: phone,
        source: "WEBSITE",
        subtotal: total,
        discount: 0,
        total,
        status: "PENDING_PAYMENT",
        notes: notes || null,
        dedupe_key: dedupeKey,
      })
      .select("id")
      .single();
    if (!error && data) {
      orderId = (data as { id: string }).id;
    } else if ((error as { code?: string } | null)?.code === "23505") {
      // Konflik unik: bedakan tabrakan order_number (retry) vs order ganda (resume).
      const { data: existing } = await svc
        .from("orders")
        .select("id, order_number, total")
        .eq("dedupe_key", dedupeKey)
        .in("status", ["PENDING_PAYMENT", "WAITING_VERIFICATION", "PAID"])
        .maybeSingle();
      const ex = existing as { id: string; order_number: string; total: number } | null;
      if (ex) resumed = ex;
      // else: tabrakan order_number → loop retry dengan nomor baru.
    }
  }
  if (resumed)
    return withRateHeaders(
      cors(
        NextResponse.json({
          order_id: resumed.id,
          order_number: resumed.order_number,
          total: resumed.total,
          resumed: true,
        }),
        req
      ),
      req,
      "orderCreate"
    );
  if (!orderId) return cors(NextResponse.json({ error: "Gagal membuat order." }, { status: 500 }), req);

  await svc.from("order_items").insert(
    validItems.map((v) => ({
      order_id: orderId,
      product_id: v.productId,
      event_id: v.eventId,
      item_type: v.itemType,
      title_snapshot: v.title,
      price_snapshot: v.price,
    }))
  );
  await svc
    .from("payments")
    .insert({ order_id: orderId, payment_method: "BANK_TRANSFER", status: "PENDING" });

  return withRateHeaders(
    cors(NextResponse.json({ order_id: orderId, order_number: orderNo, total }), req),
    req,
    "orderCreate"
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const denied = denyDisallowedOrigin(req);
  if (denied) return denied;
  const limited = await rateLimit(req, "orderStatus");
  if (limited) return cors(limited, req);

  const { searchParams } = new URL(req.url);
  const orderNumberParam = (searchParams.get("order_number") ?? "").trim();
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  if (!orderNumberParam || !isEmail(email))
    return cors(NextResponse.json({ error: "order_number + email wajib." }, { status: 400 }), req);
  if (isDemoMode())
    return cors(NextResponse.json({ error: "Mode demo." }, { status: 503 }), req);

  const svc = createServiceClient();
  const { data: orderRaw } = await svc
    .from("orders")
    .select("id, order_number, total, status, created_at, guest_email, user_id")
    .eq("order_number", orderNumberParam)
    .maybeSingle();
  const order = orderRaw as unknown as {
    id: string;
    order_number: string;
    total: number;
    status: string;
    created_at: string;
    guest_email: string | null;
    user_id: string | null;
  } | null;
  if (!order) return cors(NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 }), req);

  // Email harus cocok: tamu (guest_email) atau member (profiles.email).
  let allowed = order.guest_email?.toLowerCase() === email;
  if (!allowed && order.user_id) {
    const { data: prof } = await svc
      .from("profiles")
      .select("email")
      .eq("id", order.user_id)
      .single();
    allowed = (prof as { email: string } | null)?.email?.toLowerCase() === email;
  }
  if (!allowed) return cors(NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 }), req);

  const { data: items } = await svc
    .from("order_items")
    .select("title_snapshot, price_snapshot")
    .eq("order_id", order.id);
  const { data: payRaw } = await svc
    .from("payments")
    .select("status")
    .eq("order_id", order.id)
    .maybeSingle();
  return withRateHeaders(
    cors(
      NextResponse.json({
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        created_at: order.created_at,
        items: items ?? [],
        payment_status: (payRaw as { status: string } | null)?.status ?? "PENDING",
      }),
      req
    ),
    req,
    "orderStatus"
  );
}


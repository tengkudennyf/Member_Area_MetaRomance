// Mock Supabase-compatibel untuk DEMO lokal — DEV ONLY.
// Bentuk hasil {data, error, count} sama, jadi halaman/actions tidak berubah.
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { FILES_DIR, loadDb, saveDb, type DemoDB, type Row } from "./store";
import { DEMO_COOKIE } from "./cookie";

export { DEMO_COOKIE };

type TableName =
  | "profiles"
  | "products"
  | "orders"
  | "order_items"
  | "payments"
  | "product_access"
  | "events"
  | "event_registrations"
  | "notifications"
  | "app_settings"
  | "site_contents";

const TABLES: TableName[] = [
  "profiles",
  "products",
  "orders",
  "order_items",
  "payments",
  "product_access",
  "events",
  "event_registrations",
  "notifications",
  "app_settings",
  "site_contents",
];

function rowsOf(db: DemoDB, table: string): Row[] {
  const t = table as TableName;
  if (!TABLES.includes(t)) throw new Error(`Demo: tabel ${table} tidak dikenal`);
  return (db[t] as Row[]).slice();
}

function writeRows(db: DemoDB, table: TableName, rows: Row[]): void {
  (db[table] as Row[]) = rows;
}

type Filter =
  | { kind: "eq"; col: string; val: unknown }
  | { kind: "neq"; col: string; val: unknown }
  | { kind: "in"; col: string; vals: unknown[] }
  | { kind: "is"; col: string; val: unknown };

function match(row: Row, f: Filter): boolean {
  const v = row[f.col];
  switch (f.kind) {
    case "eq":
      return f.val === null ? v == null : v === f.val;
    case "neq":
      return f.val === null ? v != null : v !== f.val;
    case "in":
      return (f.vals as unknown[]).includes(v);
    case "is":
      return f.val === null ? v == null : v === f.val;
  }
}

// Embed: products(title, slug) → lookup via product_id; events(...) via event_id.
const EMBED_FK: Record<string, string> = { products: "product_id", events: "event_id" };

function splitCols(cols: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of cols) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function project(db: DemoDB, table: TableName, row: Row, cols: string): Row {
  if (cols.trim() === "*") return { ...row };
  const out: Row = {};
  for (const c of splitCols(cols)) {
    const m = /^(\w+)\(([^)]+)\)$/.exec(c);
    if (m) {
      const [, tbl, sub] = m;
      const fk = EMBED_FK[tbl ?? ""];
      const id = fk ? row[fk] : undefined;
      const target = tbl === "products" ? db.products : tbl === "events" ? db.events : [];
      const found = (target as Row[]).find((r) => r.id === id);
      out[tbl as string] = found ? project(db, tbl as TableName, found, sub ?? "*") : null;
    } else {
      out[c] = row[c];
    }
  }
  return out;
}

type Mode =
  | { op: "select"; cols: string; count?: string }
  | { op: "insert"; rows: Row[]; cols: string | null }
  | { op: "update"; values: Row; cols: string | null }
  | { op: "upsert"; row: Row; conflict: string[]; cols: string | null };

class Q implements PromiseLike<{
  data: Row[] | Row | null;
  error: { message: string } | null;
  count?: number;
}> {
  private filters: Filter[] = [];
  private sorts: { col: string; asc: boolean }[] = [];
  private limitN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;

  constructor(
    private db: DemoDB,
    private table: TableName,
    private mode: Mode
  ) {}

  eq(col: string, val: unknown): this {
    this.filters.push({ kind: "eq", col, val });
    return this;
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ kind: "neq", col, val });
    return this;
  }
  in(col: string, vals: unknown[]): this {
    this.filters.push({ kind: "in", col, vals });
    return this;
  }
  is(col: string, val: unknown): this {
    this.filters.push({ kind: "is", col, val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.sorts.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  select(cols = "*"): this {
    if (this.mode.op === "insert" || this.mode.op === "update" || this.mode.op === "upsert") {
      this.mode.cols = cols;
    }
    return this;
  }
  single(): PromiseLike<{ data: Row | null; error: { message: string } | null }> {
    this.singleMode = "single";
    return this as unknown as PromiseLike<{ data: Row | null; error: { message: string } | null }>;
  }
  maybeSingle(): PromiseLike<{ data: Row | null; error: { message: string } | null }> {
    this.singleMode = "maybe";
    return this as unknown as PromiseLike<{ data: Row | null; error: { message: string } | null }>;
  }

  private applyFilters(rows: Row[]): Row[] {
    let out = rows.filter((r) => this.filters.every((f) => match(r, f)));
    for (const s of this.sorts) {
      out = out.slice().sort((a, b) => {
        const av = a[s.col];
        const bv = b[s.col];
        if (av == null && bv == null) return 0;
        if (av == null) return s.asc ? 1 : -1;
        if (bv == null) return s.asc ? -1 : 1;
        if (av < bv) return s.asc ? -1 : 1;
        if (av > bv) return s.asc ? 1 : -1;
        return 0;
      });
    }
    return out;
  }

  private exec(): { data: Row[] | Row | null; error: { message: string } | null; count?: number } {
    const db = this.db;
    const mode = this.mode;
    const t = new Date().toISOString();

    if (mode.op === "insert") {
      const all = rowsOf(db, this.table);
      const inserted = mode.rows.map((r) => ({
        id: (r.id as string) ?? randomUUID(),
        created_at: (r.created_at as string) ?? t,
        ...r,
      }));
      writeRows(db, this.table, [...all, ...inserted]);
      saveDb(db);
      const cols = mode.cols ?? "*";
      const data = inserted.map((r) => project(db, this.table, r, cols));
      return this.finish(data);
    }

    if (mode.op === "update") {
      const all = rowsOf(db, this.table);
      const matched = this.applyFilters(all);
      const ids = new Set(matched.map((r) => r.id));
      const next = all.map((r) => (ids.has(r.id) ? { ...r, ...mode.values } : r));
      writeRows(db, this.table, next);
      saveDb(db);
      const cols = mode.cols ?? "*";
      return this.finish(
        next.filter((r) => ids.has(r.id)).map((r) => project(db, this.table, r, cols))
      );
    }

    if (mode.op === "upsert") {
      const all = rowsOf(db, this.table);
      const row = mode.row as Row;
      const idx = all.findIndex((r) =>
        mode.conflict.every((c: string) => (r[c] ?? null) === (row[c] ?? null))
      );
      let result: Row;
      if (idx >= 0) {
        result = { ...all[idx], ...row };
        all[idx] = result;
      } else {
        result = {
          id: (row.id as string) ?? randomUUID(),
          created_at: (row.created_at as string) ?? t,
          ...row,
        };
        all.push(result);
      }
      writeRows(db, this.table, all);
      saveDb(db);
      const cols = mode.cols ?? "*";
      return this.finish([project(db, this.table, result, cols)]);
    }

    // select
    const all = rowsOf(db, this.table);
    const matched = this.applyFilters(all);
    const count = mode.count === "exact" ? matched.length : undefined;
    const limited = this.limitN != null ? matched.slice(0, this.limitN) : matched;
    const data = limited.map((r) => project(db, this.table, r, mode.cols));
    const res = this.finish(data);
    return count === undefined ? res : { ...res, count };
  }

  private finish(data: Row[]): { data: Row[] | Row | null; error: { message: string } | null } {
    if (this.singleMode === "single") {
      if (data.length === 0) return { data: null, error: { message: "No rows found" } };
      if (data.length > 1) return { data: null, error: { message: "Multiple rows" } };
      return { data: data[0] ?? null, error: null };
    }
    if (this.singleMode === "maybe") {
      return { data: data[0] ?? null, error: null };
    }
    return { data, error: null };
  }

  then<
    TResult1 = { data: Row[] | Row | null; error: { message: string } | null; count?: number },
    TResult2 = never,
  >(
    onfulfilled?:
      | ((value: {
          data: Row[] | Row | null;
          error: { message: string } | null;
          count?: number;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    try {
      const v = this.exec();
      return Promise.resolve(v).then(onfulfilled, onrejected);
    } catch (e) {
      return Promise.reject(e).then(onfulfilled, onrejected);
    }
  }
}

function tableApi(db: DemoDB, table: TableName) {
  return {
    select: (cols = "*", opts?: { count?: string }) =>
      new Q(db, table, { op: "select", cols, count: opts?.count }),
    insert: (rows: Row | Row[]) =>
      new Q(db, table, { op: "insert", rows: Array.isArray(rows) ? rows : [rows], cols: null }),
    update: (values: Row) => new Q(db, table, { op: "update", values, cols: null }),
    upsert: (row: Row, opts?: { onConflict?: string }) =>
      new Q(db, table, {
        op: "upsert",
        row,
        conflict: opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : [],
        cols: null,
      }),
  };
}

function storageApi(db: DemoDB) {
  void db;
  return {
    from: (bucket: string) => ({
      upload: async (filePath: string, file: File | Blob, opts?: { contentType?: string }) => {
        try {
          const buf = Buffer.from(await (file as Blob).arrayBuffer());
          const dest = path.join(FILES_DIR, bucket, filePath);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, buf);
          void opts;
          return { data: { path: filePath }, error: null };
        } catch (e) {
          return {
            data: null,
            error: { message: e instanceof Error ? e.message : "Upload gagal" },
          };
        }
      },
      createSignedUrl: async (filePath: string) => ({
        data: {
          signedUrl: `/api/demo-files?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`,
        },
        error: null,
      }),
    }),
  };
}

function authApi(db: DemoDB) {
  return {
    getUser: async () => {
      const store = await cookies();
      const uid = store.get(DEMO_COOKIE)?.value;
      const found = db.authUsers.find((a) => a.id === uid);
      if (!found) return { data: { user: null }, error: null };
      return { data: { user: { id: found.id, email: found.email } }, error: null };
    },
    signUp: async (args: {
      email: string;
      password: string;
      options?: { data?: { name?: string; phone?: string } };
    }) => {
      const email = args.email.trim().toLowerCase();
      if (db.authUsers.some((a) => a.email === email)) {
        return { data: { user: null }, error: { message: "User already registered" } };
      }
      const t = new Date().toISOString();
      const authId = randomUUID();
      const profileId = randomUUID();
      db.authUsers.push({ id: authId, email, password: args.password, profileId });
      (db.profiles as Row[]).push({
        id: profileId,
        auth_user_id: authId,
        name: args.options?.data?.name ?? email.split("@")[0],
        email,
        phone: args.options?.data?.phone ?? "",
        avatar_url: null,
        role: "USER",
        status: "ACTIVE",
        created_at: t,
        updated_at: t,
      });
      saveDb(db);
      const store = await cookies();
      store.set(DEMO_COOKIE, authId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
      return { data: { user: { id: authId, email } }, error: null };
    },
    signInWithPassword: async (args: { email: string; password: string }) => {
      const email = args.email.trim().toLowerCase();
      const found = db.authUsers.find((a) => a.email === email);
      if (!found || found.password !== args.password) {
        return { data: { user: null }, error: { message: "Invalid login credentials" } };
      }
      const store = await cookies();
      store.set(DEMO_COOKIE, found.id, { path: "/", maxAge: 60 * 60 * 24 * 30 });
      return { data: { user: { id: found.id, email: found.email } }, error: null };
    },
    signOut: async () => {
      const store = await cookies();
      store.delete(DEMO_COOKIE);
      return { error: null };
    },
    resetPasswordForEmail: async (_email: string, _opts?: unknown) => {
      void _email;
      void _opts;
      return { data: {}, error: null };
    },
    updateUser: async (args: { password: string }) => {
      const store = await cookies();
      const uid = store.get(DEMO_COOKIE)?.value;
      const found = db.authUsers.find((a) => a.id === uid);
      if (!found) return { data: { user: null }, error: { message: "Not authenticated" } };
      found.password = args.password;
      saveDb(db);
      return { data: { user: { id: found.id, email: found.email } }, error: null };
    },
  };
}

export function createDemoClient() {
  const db = loadDb();
  return {
    __isDemo: true as const,
    auth: authApi(db),
    storage: storageApi(db),
    from: (table: string) => tableApi(db, table as TableName),
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;

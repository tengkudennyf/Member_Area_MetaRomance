import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, MessageCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { hasProductAccess } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { Badge, Btn, Card, PageHeader } from "@/components/ui/kit";
import SecureReader from "@/components/member/secure-reader";
import { PILLAR_LABEL, type Product } from "@/types/db";
import { getDictServer } from "@/lib/i18n/server";

// Readview ebook khusus USER (member yang sudah punya akses).
// - Ada PDF → dibaca langsung di halaman (signed URL 15 menit, tidak bisa ditebak).
// - Belum ada PDF → status jelas + cara hubungi admin.
// - Tanpa akses → terkunci. Admin tidak perlu apa-apa di sini (preview otomatis bisa).
export default async function ProductReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, profile, supabase } = await getSession();
  if (!user || !profile) redirect(`/login?next=/member/products/${slug}`);

  const { data } = await supabase.from("products").select("*").eq("slug", slug).single();
  if (!data) redirect("/member/products");
  const product = data as Product;

  const isAdmin = profile.role === "ADMIN";
  const open = isAdmin || (await hasProductAccess(supabase, profile.id, product.id));
  const { t } = await getDictServer();
  if (!open) {
    return (
      <AppShell mode="member">
        <PageHeader title={product.title} desc={PILLAR_LABEL[product.pillar]} />
        <Card>
          <p className="text-[15px] mb-2">{t.reader.locked}</p>
          <p className="text-faint text-[13px] mb-4">
            {t.reader.lockedDesc}
          </p>
          <Btn href={`/checkout/${product.id}`}>{t.reader.buyProduct}</Btn>
        </Card>
      </AppShell>
    );
  }

  const readUrl = `/api/files?productId=${product.id}`;

  if (!product.file_path) {
    const { data: support } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "support_contact")
      .maybeSingle();
    const supportText = String(
      (support as { value: unknown } | null)?.value ?? "Hubungi admin"
    ).replace(/^"|"$/g, "");
    const wa = supportText.match(/62\d{8,14}/)?.[0];

    return (
      <AppShell mode="member">
        <Link
          href="/member/products"
          className="inline-flex items-center gap-2 text-faint hover:text-accent text-[13px] transition mb-4"
        >
          <ArrowLeft size={15} /> Library
        </Link>
        <PageHeader
          title={product.title}
          desc={`${PILLAR_LABEL[product.pillar]} · ${product.product_type}`}
        />
        <Card className="text-center py-14">
          <BookOpen size={36} className="mx-auto text-accent mb-4" />
          <p className="font-display text-[20px] mb-2">{t.reader.preparing}</p>
          <p className="text-faint text-[13px] leading-relaxed max-w-md mx-auto mb-2">
            {t.reader.preparingDesc}
          </p>
          <p className="text-faint text-[12px] mb-6">{supportText}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {wa && (
              <Btn href={`https://wa.me/${wa}`} variant="ghost">
                <MessageCircle size={15} /> {t.reader.askAdmin}
              </Btn>
            )}
            <Btn variant="ghost" href="/member/products">
              {t.reader.backToLibrary}
            </Btn>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell mode="member">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Link
          href="/member/products"
          className="inline-flex items-center gap-2 text-faint hover:text-accent text-[13px] transition"
        >
          <ArrowLeft size={15} /> Library
        </Link>
        <Badge tone="border-accent/40 text-accent">
          {isAdmin ? t.reader.previewAdmin : t.reader.lifetimeAccess}
        </Badge>
      </div>
      <PageHeader
        title={product.title}
        desc={`${PILLAR_LABEL[product.pillar]} · ${product.product_type}`}
      />

      {/* Area baca — view-only: tanpa download, tanpa tab baru */}
      <Card className="!p-3 md:!p-4">
        <SecureReader src={readUrl} title={product.title} watermark={profile.email} />
      </Card>

      <Card className="mt-3">
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">{t.reader.aboutEbook}</p>
        <p className="text-faint text-[14px] leading-relaxed">{product.description}</p>
      </Card>
    </AppShell>
  );
}



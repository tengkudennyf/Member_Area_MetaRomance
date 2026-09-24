import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/permissions/guard";
import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui/kit";
import ContentForm from "@/components/admin/contents-form";
import { SITE_CONTENT_DEFAULTS, SITE_CONTENT_LABELS } from "@/lib/cms/defaults";
import type { SiteContent } from "@/types/db";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const contentKey = decodeURIComponent(key);
  const supabase = await createClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/member");
  }
  const { data } = await supabase
    .from("site_contents")
    .select("*")
    .eq("key", contentKey)
    .maybeSingle();
  const row = data as unknown as SiteContent | null;
  const fallback = SITE_CONTENT_DEFAULTS[contentKey];
  if (!row && !fallback) redirect("/admin/contents");

  const label = row?.label ?? SITE_CONTENT_LABELS[contentKey] ?? contentKey;
  const status = row?.status ?? "PUBLISHED";
  const dataJson = JSON.stringify(row?.data ?? fallback ?? {}, null, 2);

  return (
    <AppShell mode="admin">
      <PageHeader title={label} desc={`Key: ${contentKey} — simpan untuk publish ke front-end.`} />
      <ContentForm contentKey={contentKey} label={label} status={status} dataJson={dataJson} />
    </AppShell>
  );
}

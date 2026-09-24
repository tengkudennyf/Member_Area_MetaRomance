import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { Card, Empty, PageHeader } from "@/components/ui/kit";
import { fmtDateTime } from "@/lib/utils/format";
import { getDictServer } from "@/lib/i18n/server";
import type { EventItem } from "@/types/db";

export default async function MemberEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { user, profile, supabase } = await getSession();
  if (!user || !profile) redirect("/login?next=/member/events");
  const { tab } = await searchParams;
  const active = tab === "Past" ? "Past" : "Upcoming";

  const { data: regs } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("user_id", profile.id)
    .eq("status", "REGISTERED");
  const ids = (regs ?? []).map((r: { event_id: string }) => r.event_id);
  const { data: events } = ids.length
    ? await supabase.from("events").select("*").in("id", ids).order("start_at")
    : { data: [] };
  const list = ((events ?? []) as EventItem[]).filter((e) =>
    active === "Upcoming"
      ? ["PUBLISHED", "UPCOMING", "ONGOING"].includes(e.status)
      : ["COMPLETED", "CANCELLED"].includes(e.status)
  );
  const featured = active === "Upcoming" ? list[0] : undefined;
  const { t } = await getDictServer();
  const tabs = [
    { key: "Upcoming", label: t.events.upcoming },
    { key: "Past", label: t.events.past },
  ] as const;

  return (
    <AppShell mode="member">
      <PageHeader title={t.events.title} desc={t.events.desc} />
      {featured && (
        <Card className="mb-5 bg-gradient-to-br from-surface2 to-surface">
          <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-2">{t.events.nextEvent}</p>
          <h2 className="font-display text-[22px] mb-1">{featured.title}</h2>
          <p className="text-faint text-[13px] mb-4">
            {fmtDateTime(featured.start_at)} · {featured.platform}
          </p>
          <Link
            href={`/member/events/${featured.slug}`}
            className="text-accent text-[13px] font-medium hover:underline"
          >
            {t.events.viewEvent}
          </Link>
        </Card>
      )}
      <div className="flex gap-2 mb-4">
        {tabs.map((tb) => (
          <Link
            key={tb.key}
            href={tb.key === "Upcoming" ? "/member/events" : "/member/events?tab=Past"}
            className={`text-[12px] px-4 py-2 rounded-[10px] border transition ${
              active === tb.key
                ? "bg-accent text-[#202940] border-accent font-semibold"
                : "border-border text-faint hover:text-foreground"
            }`}
          >
            {tb.label}
          </Link>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty
          title={active === "Upcoming" ? t.events.emptyUpcoming : t.events.emptyPast}
          desc={t.events.emptyDesc}
        />
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <Link key={e.id} href={`/member/events/${e.slug}`}>
              <Card className="lift">
                <p className="text-[14px] font-medium">{e.title}</p>
                <p className="text-faint text-[12px] mt-0.5">
                  {fmtDateTime(e.start_at)} · {e.platform}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

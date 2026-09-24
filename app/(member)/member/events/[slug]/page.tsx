import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/shell";
import { Btn, Card, PageHeader } from "@/components/ui/kit";
import { fmtDateTime, rp } from "@/lib/utils/format";
import { getDictServer } from "@/lib/i18n/server";
import Countdown from "@/components/events/countdown";
import type { EventItem } from "@/types/db";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, profile, supabase } = await getSession();
  if (!user || !profile) redirect(`/login?next=/member/events/${slug}`);

  const { data: eventRaw } = await supabase.from("events").select("*").eq("slug", slug).single();
  if (!eventRaw) redirect("/member/events");
  const event = eventRaw as unknown as EventItem;

  const { data: reg } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", profile.id)
    .eq("status", "REGISTERED")
    .limit(1);
  const registered = (reg ?? []).length > 0;
  const { t } = await getDictServer();

  if (!registered) {
    return (
      <AppShell mode="member">
        <PageHeader title={event.title} desc={fmtDateTime(event.start_at)} />
        <Card>
          <p className="text-faint text-[14px] mb-1">{event.description}</p>
          <p className="font-display text-[20px] text-accent my-3">{rp(event.price)}</p>
          {["PUBLISHED", "UPCOMING"].includes(event.status) ? (
            <Btn href={`/checkout/${event.id}`}>{t.eventDetail.buyAndJoin}</Btn>
          ) : (
            <p className="text-faint text-[13px]">{t.eventDetail.closedReg}</p>
          )}
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell mode="member">
      <Link
        href="/member/events"
        className="inline-flex items-center gap-2 text-faint hover:text-accent text-[13px] transition mb-4"
      >
        <ArrowLeft size={15} /> Events
      </Link>
      <PageHeader title={event.title} desc={event.status} />
      <Card className="mb-4">
        <p className="text-accent text-[11px] tracking-[0.18em] uppercase mb-3">
          Event Information
        </p>
        <dl className="text-[13px] space-y-2.5">
          {[
            [t.storeDetail.platform, event.platform],
            [t.eventDetail.starts, fmtDateTime(event.start_at)],
            [t.eventDetail.ends, fmtDateTime(event.end_at)],
            [t.eventDetail.quota, event.quota == null ? t.eventDetail.unlimited : String(event.quota)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-faint">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="mb-4">
        <p className="text-[14px] font-medium mb-2">About this session</p>
        <p className="text-faint text-[13px] leading-relaxed">{event.description}</p>
      </Card>
      <Card className="text-center">
        <p className="text-faint text-[12px] mb-2">{t.eventDetail.beginsIn}</p>
        <div className="mb-4">
          <Countdown target={event.start_at} />
        </div>
        {event.meeting_url ? (
          <Btn href={event.meeting_url}>{t.eventDetail.joinNow}</Btn>
        ) : (
          <p className="text-faint text-[13px]">{t.eventDetail.meetingSoon}</p>
        )}
      </Card>
    </AppShell>
  );
}

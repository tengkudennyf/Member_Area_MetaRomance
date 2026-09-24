"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { Card, Empty, PageHeader } from "@/components/ui/kit";
import { fmtDateTime } from "@/lib/utils/format";
import { useLang } from "@/components/lang-provider";
import type { Notification } from "@/types/db";

export default function NotificationsClient() {
  const { t } = useLang();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((j) => setItems((j.notifications ?? []) as Notification[]))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  return (
    <AppShell mode="member">
      <PageHeader title={t.notifications.title} desc={t.notifications.desc} />
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty title={t.notifications.empty} desc="" />
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-70" : "border-accent/40"}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-[14px] font-medium">{n.title}</p>
                  <p className="text-faint text-[13px] mt-0.5">{n.message}</p>
                  <p className="text-faint text-[11px] mt-1">{fmtDateTime(n.created_at)}</p>
                  {n.href && (
                    <Link
                      href={n.href}
                      className="text-accent text-[13px] hover:underline mt-1 inline-block"
                    >
                      {t.common.open}
                    </Link>
                  )}
                </div>
                {!n.read_at && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-accent text-[12px] hover:underline shrink-0"
                  >
                    {t.notifications.markRead}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

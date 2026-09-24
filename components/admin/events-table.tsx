"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/kit";
import type { EventItem } from "@/types/db";
import { fmtDate } from "@/lib/utils/format";

const columns: ColumnDef<EventItem, unknown>[] = [
  {
    accessorKey: "title",
    header: "Event",
    cell: ({ row }) => (
      <span>
        <Link href={`/admin/events/${row.original.id}`} className="text-accent hover:underline">
          {row.original.title}
        </Link>
        <span className="block text-faint text-[11px]">
          {fmtDate(row.original.start_at)} · {row.original.platform}
        </span>
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        tone={
          row.original.status === "UPCOMING" || row.original.status === "ONGOING"
            ? "border-success/40 text-success"
            : row.original.status === "DRAFT"
              ? "border-warning/40 text-warning"
              : row.original.status === "CANCELLED"
                ? "border-danger/40 text-danger"
                : "border-border text-faint"
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "Peserta",
    cell: ({ row }) => (
      <Link
        href={`/admin/events/${row.original.id}/participants`}
        className="text-accent text-[12px] hover:underline"
      >
        Participants →
      </Link>
    ),
  },
];

export function AdminEventsTable({ data }: { data: EventItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search events…"
      searchKeys={["title", "slug"]}
    />
  );
}

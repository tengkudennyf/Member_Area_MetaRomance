"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/kit";
import type { Profile } from "@/types/db";
import { fmtDate } from "@/lib/utils/format";

const columns: ColumnDef<Profile, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span>
        <Link href={`/admin/users/${row.original.id}`} className="text-accent hover:underline">
          {row.original.name}
        </Link>
        <span className="block text-faint text-[11px]">{row.original.role}</span>
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email / WA",
    cell: ({ row }) => (
      <span className="text-faint">
        {row.original.email} · {row.original.phone}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Registered",
    cell: ({ row }) => <span className="text-faint">{fmtDate(row.original.created_at)}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        tone={
          row.original.status === "ACTIVE"
            ? "border-success/40 text-success"
            : "border-danger/40 text-danger"
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
];

export default function UsersTable({ data }: { data: Profile[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search users…"
      searchKeys={["name", "email", "phone"]}
    />
  );
}

"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/kit";
import { ORDER_BADGE, ORDER_LABEL, fmtDate, rp } from "@/lib/utils/format";
import { useLang } from "@/components/lang-provider";

const STATUS_OPTIONS = Object.keys(ORDER_LABEL).map((s) => ({
  value: s,
  label: ORDER_LABEL[s] ?? s,
}));

export type OrderRow = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  title: string;
  customer?: string;
};

export function MemberOrdersTable({ data }: { data: OrderRow[] }) {
  const { t } = useLang();
  const memberCols: ColumnDef<OrderRow, unknown>[] = [
    {
      accessorKey: "order_number",
      header: "Order",
      cell: ({ row }) => (
        <Link href={`/member/orders/${row.original.id}`} className="text-accent hover:underline">
          {row.original.order_number}
        </Link>
      ),
    },
    { accessorKey: "title", header: "Product" },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => <span className="text-faint">{fmtDate(row.original.created_at)}</span>,
    },
    {
      accessorKey: "status",
      header: t.orders.status,
      cell: ({ row }) => (
        <Badge tone={ORDER_BADGE[row.original.status] ?? ""}>
          {ORDER_LABEL[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
  ];
  return (
    <DataTable
      columns={memberCols}
      data={data}
      searchPlaceholder="Search orders…"
      searchKeys={["order_number", "title"]}
      filters={[{ columnId: "status", label: t.orders.status, options: STATUS_OPTIONS }]}
    />
  );
}

const adminCols: ColumnDef<OrderRow, unknown>[] = [
  {
    accessorKey: "order_number",
    header: "Order",
    cell: ({ row }) => (
      <span>
        <Link href={`/admin/orders/${row.original.id}`} className="text-accent hover:underline">
          {row.original.order_number}
        </Link>
        <span className="block text-faint text-[11px]">{fmtDate(row.original.created_at)}</span>
      </span>
    ),
  },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "title", header: "Product" },
  {
    accessorKey: "total",
    header: "Amount",
    cell: ({ row }) => rp(row.original.total),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge tone={ORDER_BADGE[row.original.status] ?? ""}>
        {ORDER_LABEL[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
];

export function AdminOrdersTable({ data }: { data: OrderRow[] }) {
  return (
    <DataTable
      columns={adminCols}
      data={data}
      searchPlaceholder="Search order…"
      searchKeys={["order_number", "title", "customer"]}
      filters={[{ columnId: "status", label: "Status", options: STATUS_OPTIONS }]}
    />
  );
}

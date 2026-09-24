"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/kit";
import { PILLAR_LABEL, type Product } from "@/types/db";
import { rp } from "@/lib/utils/format";

export type SoldInfo = { id: string; n: number; revenue: number };

function makeColumns(soldMap: Map<string, SoldInfo>): ColumnDef<Product, unknown>[] {
  return [
  {
    accessorKey: "title",
    header: "Product",
    cell: ({ row }) => (
      <span>
        <Link href={`/admin/products/${row.original.id}`} className="text-accent hover:underline">
          {row.original.title}
        </Link>
        <span className="block text-faint text-[11px]">{row.original.slug}</span>
      </span>
    ),
  },
  {
    accessorKey: "pillar",
    header: "Pillar",
    cell: ({ row }) => <span className="text-faint">{PILLAR_LABEL[row.original.pillar]}</span>,
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => rp(row.original.price),
  },
  {
    id: "sold",
    header: "Terjual",
    cell: ({ row }) => {
      const s = soldMap.get(row.original.id);
      return <span className="font-medium">{s?.n ?? 0}</span>;
    },
  },
  {
    id: "revenue",
    header: "Pendapatan",
    cell: ({ row }) => {
      const s = soldMap.get(row.original.id);
      return <span className="text-faint">{s ? rp(s.revenue) : "—"}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        tone={
          row.original.status === "PUBLISHED"
            ? "border-success/40 text-success"
            : row.original.status === "DRAFT"
              ? "border-warning/40 text-warning"
              : "border-border text-faint"
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
  ];
}

export default function ProductsTable({ data, sold }: { data: Product[]; sold: SoldInfo[] }) {
  const soldMap = new Map(sold.map((s) => [s.id, s]));
  return (
    <DataTable
      columns={makeColumns(soldMap)}
      data={data}
      searchPlaceholder="Search products…"
      searchKeys={["title", "slug"]}
      filters={[
        {
          columnId: "pillar",
          label: "Pilar",
          options: (Object.keys(PILLAR_LABEL) as (keyof typeof PILLAR_LABEL)[]).map((p) => ({
            value: p,
            label: PILLAR_LABEL[p],
          })),
        },
        {
          columnId: "status",
          label: "Status",
          options: [
            { value: "DRAFT", label: "Draft" },
            { value: "PUBLISHED", label: "Published" },
            { value: "ARCHIVED", label: "Archived" },
          ],
        },
      ]}
    />
  );
}

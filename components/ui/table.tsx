"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useState } from "react";

// §26 — TanStack Table base: search, filter, sort, pagination, responsive fallback.
export type TableFilter = {
  columnId: string;
  label: string;
  options: { value: string; label: string }[];
};

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = "Search…",
  searchKeys,
  filters,
  pageSizeOptions = [10, 25, 50, 100],
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  filters?: TableFilter[];
  pageSizeOptions?: number[];
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useReactTable({
    columns,
    data,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _col, value) => {
      const q = String(value).toLowerCase();
      if (!searchKeys) return JSON.stringify(row.original).toLowerCase().includes(q);
      return searchKeys.some((k) =>
        String(row.original[k] ?? "")
          .toLowerCase()
          .includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="flex-1 min-w-44 bg-background border border-border text-[13px] px-4 py-2.5 rounded-xl outline-none focus:border-accent"
        />
        {(filters ?? []).map((f) => {
          const col = table.getColumn(f.columnId);
          const val = (col?.getFilterValue() as string | undefined) ?? "";
          return (
            <select
              key={f.columnId}
              aria-label={f.label}
              value={val}
              onChange={(e) => col?.setFilterValue(e.target.value || undefined)}
              className="bg-background border border-border text-[13px] px-3 py-2.5 rounded-xl outline-none focus:border-accent text-faint"
            >
              <option value="">{f.label}: Semua</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        })}
        {(filters ?? []).some((f) => (table.getColumn(f.columnId)?.getFilterValue() as string | undefined)) ||
        globalFilter ? (
          <button
            onClick={() => {
              setGlobalFilter("");
              (filters ?? []).forEach((f) => table.getColumn(f.columnId)?.setFilterValue(undefined));
            }}
            className="text-[12px] text-faint hover:text-accent border border-border rounded-xl px-3 py-2.5 transition"
          >
            Reset
          </button>
        ) : null}
      </div>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className="text-left text-faint text-[11px] uppercase tracking-[0.12em] font-medium px-5 py-3.5 cursor-pointer select-none"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc"
                        ? " ↑"
                        : h.column.getIsSorted() === "desc"
                          ? " ↓"
                          : ""}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-surface2/60 transition"
                >
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-5 py-3.5">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-faint">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-[12px] text-faint">
        <span>
          Hal {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1} ·{" "}
          {table.getFilteredRowModel().rows.length} baris
        </span>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1.5">
            Tampil
            <select
              aria-label="Baris per halaman"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:border-accent"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border border-border rounded-lg px-3 py-1.5 disabled:opacity-40 hover:border-accent"
          >
            ←
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border border-border rounded-lg px-3 py-1.5 disabled:opacity-40 hover:border-accent"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

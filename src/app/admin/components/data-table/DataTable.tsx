"use client";

import { ReactNode } from "react";
import { Column } from "@/app/admin/components/data-table/types";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { SkeletonRows } from "@/app/admin/components/ui/SkeletonRows";

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyState: ReactNode; // shown when there are no rows
  errorTitle?: string;
  skeletonRows?: number;
  minWidth?: number;
};

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" };

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  error,
  onRetry,
  emptyState,
  errorTitle = "Couldn't load data",
  skeletonRows = 10,
  minWidth = 760,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
            {columns.map((c) => (
              <th key={c.header} className={`px-4 py-3 font-semibold ${ALIGN[c.align ?? "left"]}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>

        {isLoading && <SkeletonRows rows={skeletonRows} columns={columns.length} />}

        {!isLoading && error && (
          <tbody>
            <tr>
              <td colSpan={columns.length}>
                <ErrorState title={errorTitle} message={error} onRetry={onRetry} />
              </td>
            </tr>
          </tbody>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <tbody>
            <tr>
              <td colSpan={columns.length}>{emptyState}</td>
            </tr>
          </tbody>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={getRowId(row)} className="hover:bg-white/[0.03]">
                {columns.map((c) => (
                  <td
                    key={c.header}
                    className={`px-4 py-3 text-slate-300 ${ALIGN[c.align ?? "left"]} ${c.className ?? ""}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

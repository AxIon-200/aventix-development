"use client";

import { ReactNode } from "react";
import { EmptyState } from "@/app/admin/components/ui/EmptyState";
import { SkeletonRows } from "@/app/admin/components/ui/SkeletonRows";

type Column<T> = {
  header: string;
  render: (row: T) => ReactNode;
};

type RecentTableProps<T> = {
  title: string;
  rows: T[] | null;
  isLoading: boolean;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  emptyMessage: string;
  onViewAll?: () => void;
};

export function RecentTable<T>({
  title,
  rows,
  isLoading,
  columns,
  getRowId,
  emptyMessage,
  onViewAll,
}: RecentTableProps<T>) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          onClick={onViewAll}
          className="text-xs text-teal-400 hover:underline"
        >
          View all
        </button>
      </div>

      <table className="w-full text-left text-xs">
        <thead className="text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="px-2 py-2 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {isLoading && <SkeletonRows rows={3} columns={columns.length} />}

        {!isLoading && rows?.length === 0 && (
          <tbody>
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyMessage} />
              </td>
            </tr>
          </tbody>
        )}

        {!isLoading && rows && rows.length > 0 && (
          <tbody>
            {rows.map((row) => (
              <tr key={getRowId(row)} className="border-t border-white/5">
                {columns.map((col) => (
                  <td key={col.header} className="px-2 py-2.5 text-slate-300">
                    {col.render(row)}
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

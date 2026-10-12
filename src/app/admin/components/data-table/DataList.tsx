"use client";

import { ReactNode } from "react";
import { ListQueryResult } from "@/app/admin/hooks/useListQuery";
import { Column, FilterConfig } from "@/app/admin/components/data-table/types";
import { TableToolbar } from "@/app/admin/components/data-table/TableToolbar";
import { DataTable } from "@/app/admin/components/data-table/DataTable";
import { EmptyState } from "@/app/admin/components/ui/EmptyState";
import { Pagination } from "@/app/admin/components/ui/Pagination";

type DataListProps<T, F extends Record<string, string>> = {
  list: ListQueryResult<T, F>;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  noun: string; // plural, lowercase: "organizers", "bookings"
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  emptyTitle: string;
  emptyDescription?: string;
  toolbarExtra?: ReactNode;
  minTableWidth?: number;
};

// The whole "card with toolbar + table + footer + pagination" in one piece.
// A page only supplies a list (useListQuery) and its column definitions.
export function DataList<T, F extends Record<string, string>>({
  list,
  columns,
  getRowId,
  noun,
  searchPlaceholder,
  filters,
  emptyTitle,
  emptyDescription,
  toolbarExtra,
  minTableWidth,
}: DataListProps<T, F>) {
  const summary =
    list.isLoading || list.error
      ? "\u00A0"
      : list.total === 0
      ? `No ${noun} to show`
      : `Showing ${list.rangeStart.toLocaleString()}–${list.rangeEnd.toLocaleString()} of ${list.total.toLocaleString()} ${noun}`;

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <TableToolbar
        search={list.searchInput}
        onSearchChange={list.setSearchInput}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={list.filters}
        onFilterChange={list.setFilter}
        hasActiveFilters={list.hasActiveFilters}
        onClear={list.clearFilters}
      >
        {toolbarExtra}
      </TableToolbar>

      <div className="rounded-xl border border-white/10">
        <DataTable
          columns={columns}
          rows={list.data?.data ?? []}
          getRowId={getRowId}
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          errorTitle={`Couldn't load ${noun}`}
          skeletonRows={list.pageSize}
          minWidth={minTableWidth}
          emptyState={
            list.hasActiveFilters ? (
              <EmptyState
                title={`No ${noun} match your filters`}
                description="Try a different search term or filter, or clear the filters."
                actionLabel="Clear filters"
                onAction={list.clearFilters}
              />
            ) : (
              <EmptyState title={emptyTitle} description={emptyDescription} />
            )
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{summary}</p>
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          disabled={list.isLoading}
          onPageChange={list.setPage}
        />
      </div>
    </section>
  );
}

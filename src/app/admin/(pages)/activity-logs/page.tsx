"use client";

import { useMemo, useState } from "react";
import { ActivityLog, ActivityLogFilters } from "@/app/admin/types/activity-logs";
import {
  exportActivityLogs,
  getActivityLogs,
  getActivityLogStats,
} from "@/app/admin/services/activityLogService";
import { useListQuery } from "@/app/admin/hooks/useListQuery";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { downloadBlob } from "@/app/admin/lib/download";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ExportButton } from "@/app/admin/components/ui/ExportButton";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataList } from "@/app/admin/components/data-table/DataList";
import { DateRangeFilter } from "@/app/admin/components/data-table/DateRangeFilter";
import { FilterConfig } from "@/app/admin/components/data-table/types";
import { ActivityLogStatsCards } from "@/app/admin/components/activity-logs/ActivityLogStatsCards";
import { getActivityLogColumns } from "@/app/admin/components/activity-logs/activityLogColumns";
import {
  LOG_CATEGORY_OPTIONS,
  LOG_RESULT_OPTIONS,
} from "@/app/admin/components/activity-logs/activityLogStatus";
import { ActivityLogDetailsModal } from "@/app/admin/components/activity-logs/ActivityLogDetailsModal";

const PAGE_SIZE = 10;

const FILTERS: FilterConfig[] = [
  { key: "category", label: "Filter by category", allLabel: "All categories", options: LOG_CATEGORY_OPTIONS },
  { key: "result", label: "Filter by result", allLabel: "All results", options: LOG_RESULT_OPTIONS },
];

export default function ActivityLogsPage() {
  const toast = useToast();

  const list = useListQuery<ActivityLog, ActivityLogFilters>({
    fetcher: getActivityLogs,
    initialFilters: { category: "all", result: "all", from: "", to: "" },
    pageSize: PAGE_SIZE,
  });

  // The cards follow the current search + filters (see ActivityLogStatsCards).
  const stats = useFetch(
    () => getActivityLogStats({ search: list.search, filters: list.filters }),
    [list.search, list.filters.category, list.filters.result, list.filters.from, list.filters.to]
  );

  const [viewId, setViewId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const columns = useMemo(() => getActivityLogColumns({ onView: (l) => setViewId(l.id) }), []);

  async function handleExport() {
    if (list.total === 0) {
      toast.info("There are no log entries to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportActivityLogs({ search: list.search, filters: list.filters });
      downloadBlob(blob, `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Activity logs exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export activity logs.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit & Security"
        title="Activity Logs"
        description="Track admin actions and platform activity across accounts, events, bookings, and payments."
        action={<ExportButton onClick={handleExport} isLoading={isExporting} />}
      />

      <ActivityLogStatsCards
        stats={stats.data}
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
      />

      <DataList
        list={list}
        columns={columns}
        getRowId={(l) => l.id}
        noun="log entries"
        searchPlaceholder="Search actor, action, or target…"
        filters={FILTERS}
        toolbarExtra={
          <DateRangeFilter
            from={list.filters.from}
            to={list.filters.to}
            onChange={(key, value) => list.setFilter(key, value)}
          />
        }
        emptyTitle="No activity yet"
        emptyDescription="Actions taken on the platform will be recorded here."
        minTableWidth={1000}
      />

      <ActivityLogDetailsModal logId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

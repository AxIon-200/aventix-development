"use client";

import { useMemo, useState } from "react";
import { AdminEvent, EventFilters, EventStatus } from "@/app/admin/types/events";
import {
  exportEvents,
  getEvents,
  getEventStats,
  updateEventStatus,
} from "@/app/admin/services/eventService";
import { useListQuery } from "@/app/admin/hooks/useListQuery";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { downloadBlob } from "@/app/admin/lib/download";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ExportButton } from "@/app/admin/components/ui/ExportButton";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataList } from "@/app/admin/components/data-table/DataList";
import { FilterConfig } from "@/app/admin/components/data-table/types";
import { EventStatsCards } from "@/app/admin/components/events/EventStatsCards";
import { getEventColumns } from "@/app/admin/components/events/eventColumns";
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_STATUS,
  EVENT_STATUS_OPTIONS,
} from "@/app/admin/components/events/eventStatus";
import { EventDetailsModal } from "@/app/admin/components/events/EventDetailsModal";
import {
  AvailabilityTarget,
  EventAvailabilityDialog,
} from "@/app/admin/components/events/EventAvailabilityDialog";

const PAGE_SIZE = 10;

const FILTERS: FilterConfig[] = [
  { key: "status", label: "Filter by status", allLabel: "All status", options: EVENT_STATUS_OPTIONS },
  { key: "category", label: "Filter by category", allLabel: "All category", options: EVENT_CATEGORY_OPTIONS },
];

type EventRef = AvailabilityTarget["event"];

export default function EventsPage() {
  const toast = useToast();

  const list = useListQuery<AdminEvent, EventFilters>({
    fetcher: getEvents,
    initialFilters: { status: "all", category: "all" },
    pageSize: PAGE_SIZE,
  });
  const stats = useFetch(getEventStats, []);

  const [viewId, setViewId] = useState<string | null>(null);
  const [target, setTarget] = useState<AvailabilityTarget | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  function openAvailability(e: EventRef) {
    setTarget({ event: { id: e.id, title: e.title, status: e.status, attendees: e.attendees, updatedAt: e.updatedAt } });
  }

  const columns = useMemo(
    () =>
      getEventColumns({
        onView: (e) => setViewId(e.id),
        onManageAvailability: (e) =>
          setTarget({ event: { id: e.id, title: e.title, status: e.status, attendees: e.attendees, updatedAt: e.updatedAt } }),
      }),
    []
  );

  // Details modal -> availability dialog (close the modal first so they don't stack)
  function requestAvailability(e: EventRef) {
    setViewId(null);
    openAvailability(e);
  }

  async function confirmAvailability(status: EventStatus, reason?: string) {
    if (!target) return;
    setIsUpdating(true);
    try {
      await updateEventStatus(target.event.id, status, target.event.updatedAt, reason);
      toast.success(`${target.event.title} is now ${EVENT_STATUS[status].label.toLowerCase()}.`);
      setTarget(null);
      list.refetch();
      stats.refetch();
    } catch (err) {
      // Re-read server state after an uncertain or stale update.
      setTarget(null);
      list.refetch();
      stats.refetch();
      toast.error(err instanceof Error ? err.message : "Failed to update event availability.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleExport() {
    if (list.total === 0) {
      toast.info("There are no events to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportEvents({ search: list.search, filters: list.filters });
      downloadBlob(blob, `events-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Events exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export events.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Administration"
        title="Event Management"
        description="Monitor events across the platform, review details, and control event availability."
        action={<ExportButton onClick={handleExport} isLoading={isExporting} />}
      />

      <EventStatsCards
        stats={stats.data}
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
      />

      <DataList
        list={list}
        columns={columns}
        getRowId={(e) => e.id}
        noun="events"
        searchPlaceholder="Search events…"
        filters={FILTERS}
        emptyTitle="No events yet"
        emptyDescription="Events created by organizers will appear here."
      />

      <EventDetailsModal
        key={`event-details:${viewId ?? "closed"}`}
        eventId={viewId}
        onClose={() => setViewId(null)}
        onManageAvailability={requestAvailability}
      />

      <EventAvailabilityDialog
        key={target ? `event-availability:${target.event.id}:${target.event.updatedAt}` : "event-availability:closed"}
        target={target}
        isLoading={isUpdating}
        onConfirm={confirmAvailability}
        onCancel={() => !isUpdating && setTarget(null)}
      />
    </div>
  );
}
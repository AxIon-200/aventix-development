"use client";

import { useMemo, useState } from "react";
import { Organizer, OrganizerDecision, OrganizerFilters } from "@/app/admin/types/organizers";
import {
  exportOrganizers,
  getOrganizers,
  getOrganizerStats,
  updateOrganizerStatus,
} from "@/app/admin/services/organizerService";
import { useListQuery } from "@/app/admin/hooks/useListQuery";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { downloadBlob } from "@/app/admin/lib/download";
type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

function useToast(): ToastApi {
  return {
    success: (message) => console.log(message),
    error: (message) => console.error(message),
    info: (message) => console.info(message),
  };
}
import { ExportButton } from "@/app/admin/components/ui/ExportButton";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataList } from "@/app/admin/components/data-table/DataList";
import { FilterConfig } from "@/app/admin/components/data-table/types";
import { OrganizerStatsCards } from "@/app/admin/components/organizers/OrganizerStatsCards";
import { getOrganizerColumns } from "@/app/admin/components/organizers/organizerColumns";
import { ORGANIZER_STATUS_OPTIONS } from "@/app/admin/components/organizers/organizerStatus";
import { OrganizerDetailsModal } from "@/app/admin/components/organizers/OrganizerDetailsModal";
import {
  DecisionTarget,
  OrganizerDecisionDialog,
} from "@/app/admin/components/organizers/OrganizerDecisionDialog";

const PAGE_SIZE = 10;

const FILTERS: FilterConfig[] = [
  { key: "status", label: "Filter by status", allLabel: "All status", options: ORGANIZER_STATUS_OPTIONS },
];

export default function OrganizersPage() {
  const toast = useToast();

  const list = useListQuery<Organizer, OrganizerFilters>({
    fetcher: getOrganizers,
    initialFilters: { status: "all" },
    pageSize: PAGE_SIZE,
  });
  const stats = useFetch(getOrganizerStats, []);

  const [viewId, setViewId] = useState<string | null>(null);
  const [target, setTarget] = useState<DecisionTarget | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const columns = useMemo(
    () =>
      getOrganizerColumns({
        onView: (o) => setViewId(o.id),
        onDecide: (o, decision) => setTarget({ organizer: { id: o.id, name: o.name }, decision }),
      }),
    []
  );

  // Details modal -> decision dialog (close the modal first so they don't stack)
  function requestDecision(organizer: { id: string; name: string }, decision: OrganizerDecision) {
    setViewId(null);
    setTarget({ organizer: { id: organizer.id, name: organizer.name }, decision });
  }

  async function confirmDecision(reason?: string) {
    if (!target) return;
    setIsUpdating(true);
    try {
      await updateOrganizerStatus(target.organizer.id, target.decision, reason);
      toast.success(
        `${target.organizer.name} was ${target.decision === "approved" ? "approved" : "rejected"}.`
      );
      setTarget(null);
      list.refetch();
      stats.refetch();
    } catch (err) {
      // Keep the dialog open so the admin can retry.
      toast.error(err instanceof Error ? err.message : "Failed to update organizer.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleExport() {
    if (list.total === 0) {
      toast.info("There are no organizers to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportOrganizers({ search: list.search, filters: list.filters });
      downloadBlob(blob, `organizers-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Organizers exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export organizers.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizer Administration"
        title="Organizer Management"
        description="Review organizer accounts, approve applications, control access, and inspect events."
        action={<ExportButton onClick={handleExport} isLoading={isExporting} />}
      />

      <OrganizerStatsCards
        stats={stats.data}
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
      />

      <DataList
        list={list}
        columns={columns}
        getRowId={(o) => o.id}
        noun="organizers"
        searchPlaceholder="Search organizers…"
        filters={FILTERS}
        emptyTitle="No organizers yet"
        emptyDescription="Organizer applications will appear here as soon as they're submitted."
      />

      <OrganizerDetailsModal organizerId={viewId} onClose={() => setViewId(null)} onDecide={requestDecision} />

      <OrganizerDecisionDialog
        target={target}
        isLoading={isUpdating}
        onConfirm={confirmDecision}
        onCancel={() => !isUpdating && setTarget(null)}
      />
    </div>
  );
}
"use client";

import { useCallback, useMemo, useState } from "react";
import type { Organizer, OrganizerDecision, OrganizerDetails, OrganizerFilters } from "@/app/admin/types/organizers";
import { exportOrganizers, getOrganizers, getOrganizerStats, updateOrganizerStatus } from "@/app/admin/services/organizerService";
import { useListQuery } from "@/app/admin/hooks/useListQuery";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { downloadBlob } from "@/app/admin/lib/download";
import { ExportButton } from "@/app/admin/components/ui/ExportButton";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataList } from "@/app/admin/components/data-table/DataList";
import type { FilterConfig } from "@/app/admin/components/data-table/types";
import { OrganizerStatsCards } from "@/app/admin/components/organizers/OrganizerStatsCards";
import { getOrganizerColumns } from "@/app/admin/components/organizers/organizerColumns";
import { ORGANIZER_STATUS_OPTIONS } from "@/app/admin/components/organizers/organizerStatus";
import { OrganizerDetailsModal } from "@/app/admin/components/organizers/OrganizerDetailsModal";
import { OrganizerDecisionDialog, type DecisionTarget } from "@/app/admin/components/organizers/OrganizerDecisionDialog";

const FILTERS: FilterConfig[] = [
  { key: "status", label: "Filter by status", allLabel: "All statuses", options: ORGANIZER_STATUS_OPTIONS },
];

export default function OrganizersPage() {
  const list = useListQuery<Organizer, OrganizerFilters>({ fetcher: getOrganizers, initialFilters: { status: "all" }, pageSize: 10 });
  const stats = useFetch(() => getOrganizerStats(list.search), [list.search]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [target, setTarget] = useState<DecisionTarget | null>(null);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const columns = useMemo(() => getOrganizerColumns(organization => setViewId(organization.id)), []);

  const requestDecision = useCallback((organization: OrganizerDetails, decision: OrganizerDecision) => {
    setViewId(null);
    setTarget({ id: organization.id, organizationName: organization.organizationName,
      version: organization.version, previousStatus: organization.status, decision });
    setNotice("");
  }, []);

  async function confirmDecision(reason?: string) {
    if (!target) return;
    const selected = target;
    setUpdating(true);
    try {
      const result = await updateOrganizerStatus(selected.id, selected.decision, selected.version, reason);
      setNotice(result.emailStatus === "ACCEPTED" ? "Decision saved and email accepted by the provider."
        : "Decision saved, but email delivery is unconfirmed. Review the decision history and retry the email if needed.");
      list.refetch(); stats.refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The decision outcome is uncertain. Refresh the application before deciding again.");
      // A decision response may have been lost after commit. The details modal reads fresh state; never replay automatically.
      list.refetch(); stats.refetch();
    } finally {
      setUpdating(false);
      setTarget(null);
      setViewId(selected.id);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportOrganizers({ search: list.search, filters: list.filters });
      downloadBlob(blob, `organizers-${new Date().toISOString().slice(0, 10)}.csv`);
      setNotice("Organizer applications exported.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not export organizers."); }
    finally { setExporting(false); }
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Organizer Administration" title="Organizer applications"
      description="Review verified applications, email decisions, and inspect delivery history."
      action={<ExportButton onClick={handleExport} isLoading={exporting} />} />
    {notice && <p role="status" className="rounded-lg border border-teal-500/30 bg-teal-500/5 px-4 py-3 text-sm text-slate-200">{notice}</p>}
    <OrganizerStatsCards stats={stats.data} isLoading={stats.isLoading} error={stats.error} onRetry={stats.refetch} />
    <DataList list={list} columns={columns} getRowId={organization => organization.id} noun="organizers"
      searchPlaceholder="Search organizer applications" searchInputId="organizer-search" onSearchSubmit={() => list.refetch()}
      filters={FILTERS} emptyTitle="No organizer applications yet"
      emptyDescription="Applications will appear here after submission." />
    <OrganizerDetailsModal key={viewId ?? "closed"} organizerId={viewId} onClose={() => setViewId(null)} onDecide={requestDecision} onNotice={setNotice} />
    <OrganizerDecisionDialog key={target ? `${target.id}:${target.version}:${target.decision}` : "closed"} target={target} isLoading={updating} onConfirm={confirmDecision}
      onCancel={() => { if (!updating && target) { setTarget(null); setViewId(target.id); } }} />
  </div>;
}

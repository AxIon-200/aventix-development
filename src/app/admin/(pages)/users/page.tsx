"use client";

import { useMemo, useState } from "react";
import { ManagedUser, UserDecision, UserFilters } from "@/app/admin/types/users";
import {
  exportUsers,
  getUsers,
  getUserStats,
  updateUserStatus,
} from "@/app/admin/services/userService";
import { useListQuery } from "@/app/admin/hooks/useListQuery";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { downloadBlob } from "@/app/admin/lib/download";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/app/admin/components/ui/ConfirmDialog";
import { ExportButton } from "@/app/admin/components/ui/ExportButton";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataList } from "@/app/admin/components/data-table/DataList";
import { FilterConfig } from "@/app/admin/components/data-table/types";
import { UserStatsCards } from "@/app/admin/components/users/UserStatsCards";
import { getUserColumns } from "@/app/admin/components/users/userColumns";
import { USER_STATUS_OPTIONS } from "@/app/admin/components/users/userStatus";
import { UserDetailsModal } from "@/app/admin/components/users/UserDetailsModal";

const PAGE_SIZE = 10;

const FILTERS: FilterConfig[] = [
  { key: "status", label: "Filter by status", allLabel: "All statuses", options: USER_STATUS_OPTIONS },
];

type StatusTarget = { user: Pick<ManagedUser, "id" | "name">; next: UserDecision };

export default function UsersPage() {
  const toast = useToast();

  const list = useListQuery<ManagedUser, UserFilters>({
    fetcher: getUsers,
    initialFilters: { status: "all" },
    pageSize: PAGE_SIZE,
  });
  const stats = useFetch(getUserStats, []);

  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const columns = useMemo(
    () =>
      getUserColumns({
        onView: (u) => setViewUserId(u.id),
        onChangeStatus: (u, next) => setStatusTarget({ user: { id: u.id, name: u.name }, next }),
      }),
    []
  );

  // Details modal -> confirm dialog (close the modal first so they don't stack)
  function requestStatusChange(user: Pick<ManagedUser, "id" | "name">, next: UserDecision) {
    setViewUserId(null);
    setStatusTarget({ user: { id: user.id, name: user.name }, next });
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setIsUpdating(true);
    try {
      await updateUserStatus(statusTarget.user.id, statusTarget.next);
      toast.success(
        `${statusTarget.user.name} was ${statusTarget.next === "active" ? "activated" : "deactivated"}.`
      );
      setStatusTarget(null);
      list.refetch();
      stats.refetch();
    } catch (err) {
      // Keep the dialog open so the admin can retry.
      toast.error(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleExport() {
    if (list.total === 0) {
      toast.info("There are no users to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportUsers({ search: list.search, filters: list.filters });
      downloadBlob(blob, `users-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Users exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export users.");
    } finally {
      setIsExporting(false);
    }
  }

  const activating = statusTarget?.next === "active";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account Administration"
        title="User Management"
        description="Manage attendee accounts, activation status, profile access, and account activity."
        action={<ExportButton onClick={handleExport} isLoading={isExporting} />}
      />

      <UserStatsCards
        stats={stats.data}
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
      />

      <DataList
        list={list}
        columns={columns}
        getRowId={(u) => u.id}
        noun="users"
        searchPlaceholder="Search name, email, or user ID…"
        filters={FILTERS}
        emptyTitle="No users yet"
        emptyDescription="Attendee accounts will appear here as soon as people sign up."
      />

      <UserDetailsModal
        userId={viewUserId}
        onClose={() => setViewUserId(null)}
        onChangeStatus={requestStatusChange}
      />

      <ConfirmDialog
        isOpen={statusTarget !== null}
        variant={activating ? "primary" : "danger"}
        title={activating ? "Activate this user?" : "Deactivate this user?"}
        description={
          activating
            ? `${statusTarget?.user.name} will regain access to their account and be able to book tickets.`
            : `${statusTarget?.user.name} will lose access to their account and won't be able to book tickets until reactivated.`
        }
        confirmLabel={activating ? "Activate" : "Deactivate"}
        isLoading={isUpdating}
        onConfirm={confirmStatusChange}
        onCancel={() => !isUpdating && setStatusTarget(null)}
      />
    </div>
  );
}
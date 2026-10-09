"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { ManagedUser, UserDetails, UserStatus, UserStatusFilter } from "@/app/admin/types/users";
import { exportUsers, updateUserStatus } from "@/app/admin/services/userService";
import { useUsers, useUserStats } from "@/app/admin/hooks/useUsers";
import { useDebounce } from "@/app/admin/hooks/useDebounce";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/app/admin/components/ui/ConfirmDialog";
import { Pagination } from "@/app/admin/components/ui/Pagination";
import { UserStatsCards } from "@/app/admin/components/users/UserStatsCards";
import { UsersToolbar } from "@/app/admin/components/users/UsersToolbar";
import { UsersTable } from "@/app/admin/components/users/UsersTable";
import { UserDetailsModal } from "@/app/admin/components/users/UserDetailsModal";

const PAGE_SIZE = 10;

type StatusTarget = {
  user: Pick<ManagedUser, "id" | "name">;
  next: Exclude<UserStatus, "pending">;
};

export default function UsersPage() {
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [query, setQuery] = useState<{
    search: string; page: number; status: UserStatusFilter
  }>({
    search: "",
    page: 1,
    status: "all",
  });

  const searchTerm = debouncedSearch.trim();
  const users = useUsers({
    page: query.page,
    search: searchTerm,
    status: query.status,
    pageSize: PAGE_SIZE,
  });
  const stats = useUserStats();

  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const total = users.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = query.search !== "" || query.status !== "all";
  const rangeStart = total === 0 ? 0 : (query.page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(query.page * PAGE_SIZE, total);

  function clearFilters() {
    setSearchInput("");
    setQuery({ page: 1, search: "", status: "all" });
  }

  // Details modal → confirm dialog (close the modal first so they don't stack)
  function requestStatusChange(user: Pick<UserDetails, "id" | "name">, next: StatusTarget["next"]) {
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
      users.refetch();
      stats.refetch();
    } catch (err) {
      // Keep the dialog open so the admin can retry.
      toast.error(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleExport() {
    if (total === 0) {
      toast.info("There are no users to export.");
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportUsers({ search: query.search, status: query.status });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Users exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export users.");
    } finally {
      setIsExporting(false);
    }
  }

  const isActivating = statusTarget?.next === "active";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Account Administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage attendee accounts, activation status, profile access, and account activity.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-60"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export
        </button>
      </div>

      {/* Stat cards */}
      <UserStatsCards
        stats={stats.data}
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
      />

      {/* Table card */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <UsersToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          status={query.status}
          onStatusChange={(status) => setQuery((q) => ({ ...q, status, page: 1 }))}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        <div className="rounded-xl border border-white/10">
          <UsersTable
            users={users.data?.data ?? []}
            isLoading={users.isLoading}
            error={users.error}
            onRetry={users.refetch}
            skeletonRows={PAGE_SIZE}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onView={(u) => setViewUserId(u.id)}
            onChangeStatus={(u, next) => requestStatusChange(u, next)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {users.isLoading || users.error
              ? "\u00A0"
              : total === 0
              ? "No users to show"
              : `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()} users`}
          </p>
          <Pagination
            page={query.page}
            totalPages={totalPages}
            disabled={users.isLoading}
            onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
          />
        </div>
      </section>

      {/* Modals */}
      <UserDetailsModal
        userId={viewUserId}
        onClose={() => setViewUserId(null)}
        onChangeStatus={requestStatusChange}
      />

      <ConfirmDialog
        isOpen={statusTarget !== null}
        variant={isActivating ? "primary" : "danger"}
        title={isActivating ? "Activate this user?" : "Deactivate this user?"}
        description={
          isActivating
            ? `${statusTarget?.user.name} will regain access to their account and be able to book tickets.`
            : `${statusTarget?.user.name} will lose access to their account and won't be able to book tickets until reactivated.`
        }
        confirmLabel={isActivating ? "Activate" : "Deactivate"}
        isLoading={isUpdating}
        onConfirm={confirmStatusChange}
        onCancel={() => !isUpdating && setStatusTarget(null)}
      />
    </div>
  );
}

"use client";

import { Eye } from "lucide-react";
import { ManagedUser, UserStatus } from "@/app/admin/types/users";
import { formatDate } from "@/app/admin/lib/format";
import { EmptyState } from "@/app/admin/components/ui/EmptyState";
import { SkeletonRows } from "@/app/admin/components/ui/SkeletonRows";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { UserAvatar } from "@/app/admin/components/users/UserAvatar";
import { UserStatusBadge } from "@/app/admin/components/users/UserStatusBadge";

type Props = {
  users: ManagedUser[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  skeletonRows: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onView: (user: ManagedUser) => void;
  onChangeStatus: (user: ManagedUser, next: Exclude<UserStatus, "pending">) => void;
};

const COLUMNS = ["User", "Email", "Status", "Date Joined", "Actions"];

export function UsersTable({
  users,
  isLoading,
  error,
  onRetry,
  skeletonRows,
  hasActiveFilters,
  onClearFilters,
  onView,
  onChangeStatus,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
            {COLUMNS.map((c, i) => (
              <th
                key={c}
                className={`px-4 py-3 font-semibold ${i === COLUMNS.length - 1 ? "text-right" : ""}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        {isLoading && <SkeletonRows rows={skeletonRows} columns={COLUMNS.length} />}

        {!isLoading && error && (
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length}>
                <ErrorState title="Couldn't load users" message={error} onRetry={onRetry} />
              </td>
            </tr>
          </tbody>
        )}

        {!isLoading && !error && users.length === 0 && (
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length}>
                {hasActiveFilters ? (
                  <EmptyState
                    title="No users match your filters"
                    description="Try a different search term or status, or clear the filters."
                    actionLabel="Clear filters"
                    onAction={onClearFilters}
                  />
                ) : (
                  <EmptyState
                    title="No users yet"
                    description="Attendee accounts will appear here as soon as people sign up."
                  />
                )}
              </td>
            </tr>
          </tbody>
        )}

        {!isLoading && !error && users.length > 0 && (
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.name} src={u.avatarUrl} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-500">{u.userCode}</p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[240px] truncate px-4 py-3 text-slate-300">{u.email}</td>
                <td className="px-4 py-3">
                  <UserStatusBadge status={u.status} />
                </td>
                <td className="px-4 py-3 text-slate-400">{formatDate(u.joinedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {u.status !== "active" && (
                      <button
                        onClick={() => onChangeStatus(u, "active")}
                        className="rounded-md bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-300 hover:bg-teal-500/20"
                      >
                        Activate
                      </button>
                    )}
                    {u.status !== "inactive" && (
                      <button
                        onClick={() => onChangeStatus(u, "inactive")}
                        className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => onView(u)}
                      aria-label={`View ${u.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

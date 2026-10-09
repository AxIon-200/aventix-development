"use client";

import { useEffect, useState } from "react";
import { UserDetails, UserStatus } from "@/app/admin/types/users";
import { getUserById } from "@/app/admin/services/userService";
import { formatDate } from "@/app/admin/lib/format";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { UserAvatar } from "@/app/admin/components/users/UserAvatar";
import { UserStatusBadge } from "@/app/admin/components/users/UserStatusBadge";

type Props = {
  userId: string | null; // null = closed
  onClose: () => void;
  onChangeStatus: (user: UserDetails, next: Exclude<UserStatus, "pending">) => void;
};

export function UserDetailsModal({ userId, onClose, onChangeStatus }: Props) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setUser(null);
    setError(null);
    setIsLoading(true);
    getUserById(userId)
      .then((u) => !cancelled && setUser(u))
      .catch((e) => !cancelled && setError(e?.message ?? "Something went wrong"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const details: [string, string][] = user
    ? [
        ["Email", user.email],
        ["Phone", user.phone || "—"],
        ["Date joined", formatDate(user.joinedAt)],
        ["Last active", formatDate(user.lastActiveAt)],
        ["Total bookings", user.totalBookings.toLocaleString()],
        ["Tickets purchased", user.ticketsPurchased.toLocaleString()],
      ]
    : [];

  return (
    <Modal
      isOpen={userId !== null}
      onClose={onClose}
      title="User details"
      size="md"
      footer={
        <>
          {user && user.status !== "active" && (
            <button
              onClick={() => onChangeStatus(user, "active")}
              className="rounded-lg bg-teal-500/10 px-3.5 py-2 text-sm font-medium text-teal-300 hover:bg-teal-500/20"
            >
              Activate
            </button>
          )}
          {user && user.status !== "inactive" && (
            <button
              onClick={() => onChangeStatus(user, "inactive")}
              className="rounded-lg bg-red-500/10 px-3.5 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
            >
              Deactivate
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </>
      }
    >
      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 animate-pulse rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <ErrorState compact title="Couldn't load user" message={error} onRetry={() => setTick((t) => t + 1)} />
      )}

      {!isLoading && user && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <UserAvatar name={user.name} src={user.avatarUrl} size="lg" />
            <div>
              <p className="text-base font-semibold text-white">{user.name}</p>
              <p className="mb-1.5 text-xs text-slate-500">{user.userCode}</p>
              <UserStatusBadge status={user.status} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  );
}

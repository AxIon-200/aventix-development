"use client";

import { UserDecision, UserDetails } from "@/app/admin/types/users";
import { getUserById } from "@/app/admin/services/userService";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { formatDate } from "@/app/admin/lib/format";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { Avatar } from "@/app/admin/components/ui/Avatar";
import { UserStatusBadge } from "@/app/admin/components/users/userStatus";

type Props = {
  userId: string | null; // null = closed
  onClose: () => void;
  onChangeStatus: (user: UserDetails, next: UserDecision) => void;
};

export function UserDetailsModal({ userId, onClose, onChangeStatus }: Props) {
  if (!userId) return null;
  return <AttendeeDetails key={userId} userId={userId} onClose={onClose} onChangeStatus={onChangeStatus} />;
}

function AttendeeDetails({ userId, onClose, onChangeStatus }: Omit<Props, "userId"> & { userId: string }) {
  const { data: user, isLoading, error, refetch } = useFetch(() => getUserById(userId), [userId]);

  const details: [string, string][] = user
    ? [
        ["Email", user.email],
        ["Phone", user.phone || "—"],
        ["Date joined", formatDate(user.joinedAt)],
        ["Email verification", user.emailVerified ? "Verified" : "Unverified"],
        ["Total bookings", user.totalBookings.toLocaleString()],
        ["Tickets in confirmed bookings", user.ticketsPurchased.toLocaleString()],
      ]
    : [];

  return (
    <Modal
      isOpen={userId !== null}
      onClose={onClose}
      title="Attendee details"
      size="md"
      footer={
        <>
          {user && user.status !== "active" && (
            <button
              onClick={() => onChangeStatus(user, "active")}
              className="rounded-lg bg-teal-500/10 px-3.5 py-2 text-sm font-medium text-teal-300 hover:bg-teal-500/20"
            >
              Enable
            </button>
          )}
          {user && user.status !== "disabled" && (
            <button
              onClick={() => onChangeStatus(user, "disabled")}
              className="rounded-lg bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20"
            >
              Disable
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
        <ErrorState compact title="Couldn't load attendee" message={error} onRetry={refetch} />
      )}

      {!isLoading && user && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatarUrl} size="lg" />
            <div>
              <p className="text-base font-semibold text-white">{user.name}</p>
              <p className="mb-1.5 break-all text-xs text-slate-500">{user.userCode}</p>
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

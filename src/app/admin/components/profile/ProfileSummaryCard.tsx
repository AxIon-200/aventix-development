import { AdminProfile } from "@/app/admin/types/profile";
import { getInitials, formatDate } from "@/app/admin/lib/format";
import { formatLastActive } from "@/app/admin/lib/relativeTime";
import { StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export function ProfileSummaryCard({ profile }: { profile: AdminProfile }) {
  const active = profile.status === "active";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-5">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile.fullName}
            className="h-24 w-24 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-teal-400/30 bg-teal-500/10 text-3xl font-semibold text-teal-300">
            {getInitials(profile.fullName)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{profile.fullName}</p>
          <p className="mb-2 text-sm text-slate-500">{profile.roleLabel}</p>
          <StatusBadge
            label={active ? "Active account" : "Inactive account"}
            tone={active ? "success" : "danger"}
          />
        </div>
      </div>

      <div className="mt-6 space-y-0.5">
        <p className="truncate text-sm text-slate-200">{profile.email}</p>
        <p className="text-xs text-slate-500">{profile.roleLabel} access</p>
      </div>

      <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Last login</dt>
          <dd className="text-slate-200">{formatLastActive(profile.lastLoginAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Account created</dt>
          <dd className="text-slate-200">{formatDate(profile.createdAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

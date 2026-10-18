import Link from "next/link";
import { AdminProfile } from "@/app/admin/types/profile";
import { formatTimeAgo } from "@/app/admin/lib/relativeTime";
import { StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export function AccountActivityCard({ profile }: { profile: AdminProfile }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-base font-semibold text-white">Recent account activity</h2>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div>
            <p className="text-xs text-slate-500">Last password change</p>
            <p className="mt-1 text-sm font-medium text-slate-200">
              {formatTimeAgo(profile.passwordChangedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Two-factor authentication</p>
            <div className="mt-1">
              <StatusBadge
                label={profile.twoFactorEnabled ? "Enabled" : "Not enabled"}
                tone={profile.twoFactorEnabled ? "success" : "warning"}
              />
            </div>
          </div>
        </div>

        <Link
          href="/admin/settings"
          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
        >
          Review security settings
        </Link>
      </div>
    </section>
  );
}

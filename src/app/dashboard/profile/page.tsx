import { UserIcon } from "@/components/dashboard/icons";

export default function AttendeeProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Account</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Attendee Profile & Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal details, notification preferences, and membership tier.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary Card */}
        <div className="rounded-xl border border-white/10 bg-[#111827] p-5 shadow-sm text-center flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 ring-2 ring-teal-500/30">
            <UserIcon className="h-10 w-10" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-white">Sherwin Cruz</h2>
          <p className="text-xs text-slate-400">sherwin@aventix.io</p>
          <div className="mt-3">
            <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400">
              Silver Tier Member &bull; 1,240 pts
            </span>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#111827] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-white">Personal Information</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">First Name</label>
              <input
                type="text"
                defaultValue="Sherwin"
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0F19] px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Last Name</label>
              <input
                type="text"
                defaultValue="Cruz"
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0F19] px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Email Address</label>
              <input
                type="email"
                defaultValue="sherwin@aventix.io"
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0F19] px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Mobile Phone</label>
              <input
                type="tel"
                defaultValue="+63 917 123 4567"
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0F19] px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-teal-400">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

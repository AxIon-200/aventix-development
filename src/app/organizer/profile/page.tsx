import { ShieldCheck, CreditCard, Save } from "lucide-react";

export default function OrganizerProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Organizer Profile & Payouts</h1>
          <p className="mt-1 text-sm text-slate-500">Manage public organization credentials and connected bank account.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Verification Status Badge */}
        <div className="rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Verification Status</h2>
          </div>
          <div className="mt-3">
            <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              Verified Organizer
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Your organization profile is approved. You can host public ticketed events and withdraw earnings.
          </p>
        </div>

        {/* Payout Account */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Direct Payout Account</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Event ticket proceeds are disbursed to this registered local bank account.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">Bank Name</label>
              <input
                type="text"
                defaultValue="BDO Unibank, Inc."
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f141f] px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Account Number</label>
              <input
                type="text"
                defaultValue="•••• •••• •••• 4912"
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f141f] px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Organization Details Form */}
      <div className="rounded-xl border border-white/10 bg-[#111622] p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-white">Public Brand Information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400">Organization / Producer Name</label>
            <input
              type="text"
              defaultValue="Aventix Live Productions"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Contact Email</label>
            <input
              type="email"
              defaultValue="organizer@aventix.io"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400">Organizer Bio</label>
            <textarea
              rows={3}
              defaultValue="Premier concert producer and festival creator organizing high-voltage live experiences across Southeast Asia."
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400">
            <Save className="h-3.5 w-3.5" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

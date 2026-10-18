import OrganizerTopbar from "@/components/organizer/OrganizerTopbar";

export default function CreateEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <OrganizerTopbar
        title="Create New Event"
        subtitle="Set up event details, ticket tiers, seating map, and schedule"
      />

      <div className="rounded-xl border border-white/10 bg-[#111622] p-6 shadow-sm">
        <form className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Event Title</label>
              <input
                type="text"
                placeholder="e.g. Electric Pulse Rave 2026"
                className="w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Category</label>
              <select className="w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-sm text-white focus:border-teal-500 focus:outline-none">
                <option value="Concert">Concert</option>
                <option value="Conference">Conference</option>
                <option value="Festival">Festival</option>
                <option value="Sports">Sports</option>
                <option value="Theater">Theater</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Event Date & Time</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Venue & City</label>
              <input
                type="text"
                placeholder="e.g. Mall of Asia Arena, Pasay City"
                className="w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Event Description</label>
            <textarea
              rows={4}
              placeholder="Provide a detailed description of the event, line-up, guidelines, and dress code..."
              className="w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              Save as Draft
            </button>
            <button
              type="button"
              className="rounded-lg bg-teal-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
            >
              Continue to Ticket Tiers
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

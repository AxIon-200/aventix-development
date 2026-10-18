export default function AttendeeBookingHistoryPage() {
  const sampleBookings = [
    {
      ref: "AVX-90182",
      event: "Neon Eclipse Rave",
      date: "Oct 12, 2026",
      tickets: 2,
      total: "₱9,000",
      status: "COMPLETED",
    },
    {
      ref: "AVX-89310",
      event: "Sunset Jazz Festival",
      date: "Sep 28, 2026",
      tickets: 1,
      total: "₱3,500",
      status: "COMPLETED",
    },
    {
      ref: "AVX-71923",
      event: "Metro Indie Acoustic Night",
      date: "Aug 15, 2026",
      tickets: 2,
      total: "₱1,800",
      status: "COMPLETED",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Transactions</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Booking History & Receipts</h1>
        <p className="mt-1 text-sm text-slate-500">
          View all your previous purchases, transaction details, and download tax invoices.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-[#161F30] uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Date Booked</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Total Paid</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {sampleBookings.map((b) => (
                <tr key={b.ref} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-teal-400">{b.ref}</td>
                  <td className="px-4 py-3 font-medium text-white">{b.event}</td>
                  <td className="px-4 py-3 text-slate-400">{b.date}</td>
                  <td className="px-4 py-3">{b.tickets}</td>
                  <td className="px-4 py-3 font-semibold text-white">{b.total}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-teal-400 hover:underline">
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

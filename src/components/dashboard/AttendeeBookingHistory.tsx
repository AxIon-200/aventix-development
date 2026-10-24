"use client";

import { useState } from "react";
import { useAttendeeRecords } from "./useAttendeeRecords";
import { money } from "@/lib/attendee-records";
import { DateRangePicker } from "@/components/shared/date-picker";

export default function AttendeeBookingHistoryPage() {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const records = useAttendeeRecords();
  const bookings = [...records.bookings, ...records.demos]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(booking => ({
      ref: booking.reference, event: booking.eventTitle,
      date: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" }).format(new Date(booking.createdAt)),
      isoDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(booking.createdAt)),
      tickets: booking.quantity, total: money(booking.status === "REFUNDED" ? 0 : booking.paidCentavos),
      status: booking.simulation ? "DEMO (no charge)" : booking.status,
    }));

  const filteredBookings = bookings.filter((b) => {
    if (dateRange.from && b.isoDate < dateRange.from) return false;
    if (dateRange.to && b.isoDate > dateRange.to) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Transactions</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Booking History & Receipts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your booking history and paid amounts. Demo bookings are shown with no charge.
          </p>
        </div>

        <DateRangePicker
          from={dateRange.from}
          to={dateRange.to}
          onChange={(key, value) => setDateRange((prev) => ({ ...prev, [key]: value }))}
          placeholder="Filter by booking date…"
          ariaLabel="Filter bookings by date range"
        />
      </div>

      {records.loading && <p role="status">Loading your bookings...</p>}
      {records.error && <p role="alert">{records.error} <button type="button" onClick={records.retry} className="underline">Retry</button></p>}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {records.loading ? "Loading?" : records.error ? "Booking records are unavailable." : "No bookings found for the selected date range."}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

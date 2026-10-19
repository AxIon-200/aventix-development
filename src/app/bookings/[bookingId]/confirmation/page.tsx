import type { Metadata } from "next";
import ConfirmedETicket, { DEFAULT_ETICKET_DATA } from "@/components/booking/ConfirmedETicket";

export const metadata: Metadata = {
  title: "Booking Confirmation | Aventix",
  robots: { index: false, follow: false },
};

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return (
    <div className="min-h-screen bg-[#0B0F19] px-4 py-8 text-white sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <span className="rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-300">
            Admission Pass Issued
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            Booking Confirmed
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Reference: <span className="font-mono font-bold text-teal-300">{bookingId}</span>
          </p>
        </div>

        <ConfirmedETicket
          data={{
            ...DEFAULT_ETICKET_DATA,
            bookingRef: bookingId || DEFAULT_ETICKET_DATA.bookingRef,
          }}
          showActions={true}
        />
      </div>
    </div>
  );
}

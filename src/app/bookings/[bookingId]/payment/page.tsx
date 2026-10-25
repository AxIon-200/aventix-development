import WorkspacePage from "@/components/auth/WorkspacePage";
import BookingRecordView from "@/components/booking/BookingRecordView";

export const metadata = { title: "Booking payment | Aventix", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ bookingId: string }>; searchParams: Promise<{ method?: string }> }) {
  const { bookingId } = await params;
  const { method } = await searchParams;
  return <WorkspacePage role="ATTENDEE" title="Booking payment" returnTo={`/bookings/${encodeURIComponent(bookingId)}/payment`}><BookingRecordView bookingId={bookingId} mode="payment" initialMethod={["gcash", "paymaya", "card"].includes(method ?? "") ? method : ""} /></WorkspacePage>;
}

import type { Metadata } from "next";
import BookingRecordView from "@/components/booking/BookingRecordView";
export const metadata: Metadata = { title: "Booking payment | Aventix", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <BookingRecordView key={bookingId} bookingId={bookingId} mode="payment" />;
}

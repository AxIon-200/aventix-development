import { notFound } from "next/navigation";
import BookingPreview from "@/components/booking/preview/BookingPreview";
export const dynamic = "force-dynamic";
export const metadata = { title: "Booking screens — development preview", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <BookingPreview />;
}

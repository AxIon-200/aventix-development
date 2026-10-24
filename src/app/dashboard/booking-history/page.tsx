import WorkspacePage from "@/components/auth/WorkspacePage";
import AttendeeBookingHistory from "@/components/dashboard/AttendeeBookingHistory";

export const metadata = { title: "Booking history | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ATTENDEE" title="Booking history"><AttendeeBookingHistory /></WorkspacePage>;
}

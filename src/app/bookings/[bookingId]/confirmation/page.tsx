import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Booking confirmation | Aventix", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <WorkspacePage role="ATTENDEE" title="Booking confirmation" returnTo={`/bookings/${encodeURIComponent(bookingId)}/confirmation`} />;
}

import IssuedTicketView from "@/components/booking/IssuedTicketView";
export const metadata = { title: "Your ticket | Aventix", robots: { index: false, follow: false } };
export default async function TicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  return <IssuedTicketView ticketId={ticketId} />;
}

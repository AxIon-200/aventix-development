import type { Metadata } from "next";
import SeatSelection from "@/components/booking/SeatSelection";
export const metadata: Metadata = { title: "Numbered-seat selection | Aventix", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SeatSelection key={id} eventId={id} />;
}

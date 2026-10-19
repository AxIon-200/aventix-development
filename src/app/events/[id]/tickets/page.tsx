import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Ticket options | Aventix" };

export default async function TicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const { category } = await searchParams;
  const query = category ? `&category=${encodeURIComponent(category)}` : "";
  redirect(`/dashboard/buy-tickets?eventId=${encodeURIComponent(id)}${query}`);
}

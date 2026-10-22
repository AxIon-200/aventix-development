import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Buy tickets | Aventix", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ eventId?: string; category?: string }> }) {
  const { eventId, category } = await searchParams;
  const returnTo = typeof eventId === "string" ? `/dashboard/buy-tickets?eventId=${encodeURIComponent(eventId)}${typeof category === "string" ? `&category=${encodeURIComponent(category)}` : ""}` : undefined;
  return <WorkspacePage role="ATTENDEE" title="Buy tickets" returnTo={returnTo} />;
}

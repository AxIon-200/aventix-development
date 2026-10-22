import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Event tickets | Aventix", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const { category } = await searchParams;
  const returnTo = `/events/${encodeURIComponent(id)}/tickets${typeof category === "string" ? `?category=${encodeURIComponent(category)}` : ""}`;
  return <WorkspacePage role="ATTENDEE" title="Event tickets" returnTo={returnTo} />;
}

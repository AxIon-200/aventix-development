import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Bookings | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ADMINISTRATOR" title="Bookings" />;
}

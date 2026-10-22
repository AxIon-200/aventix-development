import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Dashboard | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Dashboard" />;
}

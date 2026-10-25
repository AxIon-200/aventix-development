import WorkspacePage from "@/components/auth/WorkspacePage";
import Dashboard from "@/components/organizer/screens/Dashboard";

export const metadata = { title: "Dashboard | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Dashboard"><Dashboard /></WorkspacePage>;
}

import WorkspacePage from "@/components/auth/WorkspacePage";
import CreateEvent from "@/components/organizer/screens/CreateEvent";

export const metadata = { title: "Create event | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Create event"><CreateEvent /></WorkspacePage>;
}

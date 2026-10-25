import WorkspacePage from "@/components/auth/WorkspacePage";
import Events from "@/components/organizer/screens/Events";

export const metadata = { title: "My Events | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="My Events"><Events /></WorkspacePage>;
}

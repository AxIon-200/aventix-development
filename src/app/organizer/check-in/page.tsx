import WorkspacePage from "@/components/auth/WorkspacePage";
import CheckIn from "@/components/organizer/screens/CheckIn";

export const metadata = { title: "Ticket Scanner | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Ticket Scanner"><CheckIn /></WorkspacePage>;
}

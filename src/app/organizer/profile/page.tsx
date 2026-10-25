import WorkspacePage from "@/components/auth/WorkspacePage";
import Profile from "@/components/organizer/screens/Profile";

export const metadata = { title: "Organizer Profile | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Organizer Profile"><Profile /></WorkspacePage>;
}

import WorkspacePage from "@/components/auth/WorkspacePage";
import Analytics from "@/components/organizer/screens/Analytics";

export const metadata = { title: "Sales & Analytics | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Sales & Analytics"><Analytics /></WorkspacePage>;
}

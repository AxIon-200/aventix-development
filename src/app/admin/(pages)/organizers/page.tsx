import WorkspacePage from "@/components/auth/WorkspacePage";
import OrganizerReview from "@/components/admin/OrganizerReview";

export const metadata = { title: "Organizers | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ADMINISTRATOR" title="Organizers"><OrganizerReview /></WorkspacePage>;
}

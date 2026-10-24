import WorkspacePage from "@/components/auth/WorkspacePage";
import AttendeeTickets from "@/components/dashboard/AttendeeTickets";

export const metadata = { title: "My tickets | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ATTENDEE" title="My tickets"><AttendeeTickets /></WorkspacePage>;
}

import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Profile | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ATTENDEE" title="Profile" attendeeProfile />;
}

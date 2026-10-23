import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Attendee workspace | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ATTENDEE" title="Attendee workspace" />;
}

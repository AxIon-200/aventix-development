import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Create event | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Create event" />;
}

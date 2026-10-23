import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Check-in | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ORGANIZER" title="Check-in" />;
}

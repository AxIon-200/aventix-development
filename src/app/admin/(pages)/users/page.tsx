import WorkspacePage from "@/components/auth/WorkspacePage";

export const metadata = { title: "Users | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  return <WorkspacePage role="ADMINISTRATOR" title="Users" />;
}

import { notFound } from "next/navigation";
import WorkspacePage from "@/components/auth/WorkspacePage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking development preview | Aventix", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <WorkspacePage role="ATTENDEE" title="Booking development preview" />;
}

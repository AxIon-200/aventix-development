import OrganizerSidebar from "@/components/organizer/OrganizerSidebar";
import OrganizerTopbar from "@/components/organizer/OrganizerTopbar";

export default function OrganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <OrganizerSidebar />
      <div className="min-w-0 flex-1">
        <OrganizerTopbar />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

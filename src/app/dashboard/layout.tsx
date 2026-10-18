import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <DashboardSidebar />
      <div className="min-w-0 flex-1">
        <DashboardTopbar />
        <main className="p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
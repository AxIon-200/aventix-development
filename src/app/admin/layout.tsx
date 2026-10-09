import { AdminSidebar } from "@/app/admin/components/layout/AdminSidebar";
import { AdminTopbar } from "@/app/admin/components/layout/AdminTopbar";
import { ToastProvider } from "@/app/admin/components/ui/ToastProvider";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#0B0F19]">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminTopbar />
          <main className="p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
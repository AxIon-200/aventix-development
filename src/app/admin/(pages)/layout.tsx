import { AdminSidebar } from "@/app/admin/components/layout/AdminSidebar";
import { AdminTopbar } from "@/app/admin/components/layout/AdminTopbar";

export default function AdminPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main id="main-content" className="min-w-0 flex-1 px-3 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

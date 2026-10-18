import OrganizerSidebar from "@/components/organizer/OrganizerSidebar";
import Footer from "@/components/Footer";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0f15] font-sans text-slate-100 flex flex-col selection:bg-teal-400 selection:text-slate-950">
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:px-7">
        <OrganizerSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

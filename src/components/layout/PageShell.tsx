import type { EventDetails } from "@/types/event";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PageShell({ children, searchEvents }: { children: React.ReactNode; searchEvents?: EventDetails[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0c10] font-sans text-white">
      <Navbar searchEvents={searchEvents} />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

import { Inter, Outfit } from "next/font/google";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import Footer from "@/components/Footer";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
// Figma uses Geist for body text. Inter is used here so no extra font setup is needed.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Shared by all attendee dashboard pages (#10 to #14): the sidebar stays, only the page content changes.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${outfit.variable} ${inter.variable} min-h-screen bg-[#0b0c10] font-[family-name:var(--font-inter)] text-white`}
    >
      {/* TODO: render the attendee Navbar here (Figma: "Nav - ATTENDEE USER LOGIN") */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-7">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <Footer />
    </div>
  );
}
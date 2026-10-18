import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0c10] font-sans text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

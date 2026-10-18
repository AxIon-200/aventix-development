import Navbar from "@/components/Navbar";

export default function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className="min-h-screen bg-[#0b0c10]">
    <Navbar />
    <main id="main-content" className="relative isolate flex min-h-[calc(100svh-80px)] items-start justify-center overflow-hidden px-4 py-10 sm:py-16 lg:py-[86px]">
      {/* Figma concert background could not be downloaded; see FRONTEND-HANDOFF.md. */}
      <div aria-hidden className="absolute inset-0 -z-30 bg-[radial-gradient(ellipse_at_75%_20%,#17464b_0%,#0b0c10_65%)]" />
      <div aria-hidden className="absolute inset-0 -z-20 bg-gradient-to-b from-[#0b0c10]/30 via-[#0b0c10]/20 to-[#0b0c10]/90" />

      <section className={`relative w-full ${wide ? "max-w-[620px]" : "max-w-[480px]"} rounded-[20px] border border-[#1f2833] bg-[#11151b]/[0.97] p-6 shadow-2xl sm:p-10`}>
        {children}
      </section>
    </main>
  </div>;
}

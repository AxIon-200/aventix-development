import Navbar from "@/components/Navbar";
import styles from "./AuthShell.module.css";

export default function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className="min-h-screen bg-[#0b0c10]">
    <Navbar />
    <main id="main-content" className={styles.main}>
      {/* Figma concert background could not be downloaded; see FRONTEND-HANDOFF.md. */}
      <div aria-hidden className="absolute inset-0 -z-30 bg-[radial-gradient(ellipse_at_75%_20%,#17464b_0%,#0b0c10_65%)]" />
      <div aria-hidden className="absolute inset-0 -z-20 bg-gradient-to-b from-[#0b0c10]/30 via-[#0b0c10]/20 to-[#0b0c10]/90" />

      <section className={`${styles.card} ${wide ? styles.wide : ""}`}>
        {children}
      </section>
    </main>
  </div>;
}

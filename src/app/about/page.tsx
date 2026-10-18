import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Aventix",
  description: "Aventix is a concert, gig, and live music ticketing platform for the Philippines.",
};

const STORY = [
  {
    title: "Our Story",
    body: "Aventix brings concerts, gigs, and festivals into one place so music lovers can spend less time searching and more time looking forward to the show.",
  },
  {
    title: "What We Do",
    body: "We connect audiences with event organizers through a simple ticketing experience designed around discovery, booking, and the excitement of live music.",
  },
];

const VALUES = [
  { n: "01", title: "Discover", body: "Find concerts, gigs, and festivals that fit your sound." },
  { n: "02", title: "Book", body: "Choose your tickets through a clear, straightforward booking flow." },
  { n: "03", title: "Experience", body: "Keep your focus on the music and the moments that matter." },
];

export default function AboutPage() {
  return (
    <PageShell>
      <section aria-labelledby="about-title" className="bg-[#0b0c10]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-center gap-10 px-4 py-16 sm:px-6 lg:min-h-[560px] lg:flex-row lg:gap-12 lg:px-[120px] lg:py-20">
          <div className="w-full lg:w-[680px]">
            <p className="text-sm font-semibold text-[#66fcf1]">ABOUT AVENTIX</p>
            <h1 id="about-title" className="mt-[18px] font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-[60px] lg:leading-[68px]">
              Bringing people closer to live music.
            </h1>
            <p className="mt-[18px] max-w-[560px] text-lg leading-7 text-[#c5c6c7]">
              Aventix is a concert, gig, and live music ticketing platform built to make discovering events, securing tickets, and experiencing the moment simpler.
            </p>
            <Link href="/about/experience" className="mt-6 inline-block text-sm text-[#66fcf1]">Explore the Aventix experience →</Link>
          </div>
          <div
            aria-hidden
            className="flex w-full flex-col gap-3.5 overflow-hidden rounded-3xl border border-[#66fcf1]/35 bg-gradient-to-r from-[#45a29e] from-0% to-[#66fcf1] to-[125%] p-8 text-[#0b0c10] lg:h-[350px] lg:w-[420px] lg:shrink-0"
          >
            <p className="font-display text-4xl font-bold leading-[1.4] sm:text-5xl sm:leading-[68px]">
              LIVE MUSIC
              <br />
              STARTS HERE
            </p>
            <p className="text-sm font-semibold leading-7">Discover • Book • Experience</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="story-heading" className="bg-[#0b0c10]">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-[120px] lg:py-[72px]">
          <h2 id="story-heading" className="font-display text-3xl font-bold text-white sm:text-4xl">
            Built for the live music community
          </h2>
          <div className="mt-7 grid gap-6 md:grid-cols-2">
            {STORY.map((c) => (
              <article key={c.title} className="rounded-2xl border border-[#2c3644] bg-[#1f2833] p-7 md:min-h-[230px]">
                <h3 className="font-display text-xl font-bold leading-8 text-white">{c.title}</h3>
                <p className="mt-3.5 max-w-[520px] text-sm text-[#c5c6c7]">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="values-heading" className="bg-[#0b0c10]">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-[120px] lg:py-[72px]">
          <h2 id="values-heading" className="font-display text-3xl font-bold text-white sm:text-4xl">
            What Aventix stands for
          </h2>
          <ul className="mt-7 grid gap-5 md:grid-cols-3">
            {VALUES.map((v) => (
              <li key={v.n} className="rounded-2xl border border-[#2c3644] bg-[#1f2833] p-[26px] md:min-h-[220px]">
                <p className="text-xs font-bold text-[#66fcf1]">{v.n}</p>
                <h3 className="mt-3 font-display text-xl font-bold leading-8 text-white">{v.title}</h3>
                <p className="mt-3 max-w-[330px] text-sm text-[#c5c6c7]">{v.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>


    </PageShell>
  );
}

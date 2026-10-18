export default function Lineup({ performers }: { performers: string[] }) {
  return (
    <section id="lineup" aria-labelledby="lineup-heading" className="scroll-mt-36 bg-[#0b0c10]">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-16">
        <p className="text-[13px] font-bold tracking-wide text-[#66fcf1]">LINE UP</p>
        <h2 id="lineup-heading" className="mt-2 font-display text-[26px] font-bold text-white">
          Who&apos;s performing
        </h2>
        <ul className="mt-6 flex flex-wrap gap-3">
          {performers.map((p) => (
            <li key={p} className="rounded-full border border-[#242c36] bg-[#151b23] px-5 py-2.5 text-[15px] font-semibold text-white">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function EventSectionNav({ hasPlaylist, hasLineup }: { hasPlaylist: boolean; hasLineup: boolean }) {
  const links = [
    { href: "#tickets", label: "Tickets" },
    { href: "#info", label: "Info" },
    ...(hasPlaylist ? [{ href: "#playlist", label: "Playlist" }] : []),
    ...(hasLineup ? [{ href: "#lineup", label: "Line up" }] : []),
  ];
  return (
    <nav aria-label="Event sections" className="sticky top-16 xl:top-[72px] z-40 border-b border-[#1f2833] bg-[#151b23]">
      <ul className="mx-auto flex max-w-[1440px] items-center gap-9 overflow-x-auto px-4 py-4 text-sm font-medium sm:px-6 lg:px-16">
        {links.map((l) => (
          <li key={l.href} className="shrink-0">
            <a
              href={l.href}
              className="text-[#c5c6c7] transition-colors hover:text-[#66fcf1] focus-visible:text-[#66fcf1] focus-visible:outline-none"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

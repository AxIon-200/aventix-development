import { BellIcon, SearchIcon } from "./icons";

// Reusable for the other attendee pages: just change the title.
export default function DashboardTopbar({ title }: { title: string }) {
  return (
    <header className="flex min-h-[72px] items-center justify-between gap-4 border border-[#2c3644] bg-[#0b0c10] px-6 py-3 sm:px-8">
      <h1 className="font-[family-name:var(--font-outfit)] text-[22px] font-bold text-white">{title}</h1>
      <div className="flex items-center gap-5">
        {/* TODO: connect to the real search once the team agrees on it */}
        <label className="hidden w-[280px] items-center gap-2.5 rounded-full border border-[#2c3644] px-4 py-2 md:flex">
          <SearchIcon className="h-4 w-4 text-[#c5c6c7]" />
          <input
            type="search"
            placeholder="Search events, tickets..."
            className="w-full bg-transparent text-[13px] text-white placeholder:text-[#c5c6c7] focus:outline-none"
          />
        </label>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#2c3644] text-white"
        >
          <BellIcon className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff2d6f]" />
        </button>
      </div>
    </header>
  );
}

"use client";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { EventDetails } from "@/types/event";
import { formatShortDate } from "@/lib/format";

/** Suggestions use a supplied public index only; no speculative API endpoint. */
export default function EventSearchField({
  events,
  onSearch,
  onNavigate,
  compact = false,
}: {
  events?: EventDetails[];
  onSearch?: (query: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches =
    query.trim().length >= 2
      ? events
          ?.filter((event) =>
            `${event.name} ${event.performers.join(" ")}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          )
          .slice(0, 6)
      : undefined;
  const expanded = open && matches !== undefined;
  function navigate(index?: number) {
    setOpen(false);
    onNavigate?.();
    if (index !== undefined && matches?.[index])
      router.push(`/events/${encodeURIComponent(matches[index].id)}`);
    else if (onSearch) onSearch(query);
    else
      router.push(
        query.trim()
          ? `/events?q=${encodeURIComponent(query.trim())}`
          : "/events",
      );
  }
  return (
    <form
      role="search"
      className={`relative ${compact ? "w-full" : "w-48 lg:w-56"}`}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(expanded && active >= 0 ? active : undefined);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c5c6c7]"
      />
      <input
        ref={input}
        role="combobox"
        aria-label="Search events"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={`${id}-results`}
        aria-activedescendant={
          expanded && active >= 0 ? `${id}-${active}` : undefined
        }
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setActive(-1);
          }
          if (
            matches?.length &&
            (event.key === "ArrowDown" || event.key === "ArrowUp")
          ) {
            event.preventDefault();
            setOpen(true);
            setActive(
              (index) =>
                (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  matches.length) %
                matches.length,
            );
          }
        }}
        type="search"
        placeholder="Search events..."
        className="h-[38px] w-full rounded-full border border-[#2c3644] bg-[#1f2833] pl-10 pr-10 text-sm text-white placeholder:text-[#c5c6c7]/80 focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1]"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setActive(-1);
            setOpen(false);
            input.current?.focus();
          }}
          className="absolute right-1 top-0 flex h-[38px] w-9 items-center justify-center rounded-full text-[#9aa4ae]"
        >
          <X size={14} />
        </button>
      )}
      {expanded && (
        <div className="absolute right-0 top-full z-[60] mt-2 w-full min-w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#2c3644] bg-[#1f2833] p-2 shadow-2xl">
          <ul id={`${id}-results`} role="listbox" aria-label="Matching events">
            {matches.map((event, index) => (
              <li
                key={event.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={active === index}
                onPointerMove={() => setActive(index)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => navigate(index)}
                className={`cursor-pointer rounded-xl p-3 ${active === index ? "bg-[#2c3644]" : ""}`}
              >
                <span className="block text-sm font-medium text-white">
                  {event.name}
                </span>
                <span className="mt-1 block text-xs text-[#c5c6c7]">
                  {formatShortDate(event.startsAt)} ·{" "}
                  {event.venue.city ?? event.venue.name}
                </span>
              </li>
            ))}
          </ul>
          {matches.length === 0 && (
            <p role="status" className="p-3 text-xs leading-5 text-[#c5c6c7]">
              No matching events. Press Enter to search all events.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

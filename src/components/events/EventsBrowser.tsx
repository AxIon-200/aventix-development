"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { EventDetails } from "@/types/event";
import EventCard from "./EventCard";
import { DATE_FILTERS, eventLocation, matchesDate, monthKey, uniqueSorted, type DateFilter } from "@/lib/event-filters";

const field =
  "h-[58px] w-full rounded-[14px] border border-[#2c3644] bg-[#1f2833] text-[13px] font-medium text-[#c5c6c7] focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1]";

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <label className="sr-only" htmlFor={`f-${label}`}>
        {label}
      </label>
      <select
        id={`f-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${field} cursor-pointer appearance-none pl-[17px] pr-10`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1f2833] text-white">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
    </div>
  );
}

export default function EventsBrowser({ events, initialQuery = "" }: { events: EventDetails[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState("all");
  const [date, setDate] = useState<DateFilter>("all");
  const [category, setCategory] = useState("all");
  const [genre, setGenre] = useState("all");

  const locations = useMemo(() => uniqueSorted(events.map(eventLocation)), [events]);
  const categories = useMemo(() => uniqueSorted(events.map((e) => e.type)), [events]);
  const genres = useMemo(() => uniqueSorted(events.map((e) => e.genre)), [events]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const filtered = events
      .filter((e) => {
        if (q && !`${e.name} ${e.performers.join(" ")}`.toLowerCase().includes(q)) return false;
        if (location !== "all" && eventLocation(e) !== location) return false;
        if (category !== "all" && e.type !== category) return false;
        if (genre !== "all" && e.genre !== genre) return false;
        return matchesDate(e.startsAt, date, now);
      })
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

    const map = new Map<string, { label: string; items: EventDetails[] }>();
    for (const e of filtered) {
      const { key, label } = monthKey(e.startsAt);
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values());
  }, [events, query, location, date, category, genre]);

  const filtersActive = query !== "" || location !== "all" || date !== "all" || category !== "all" || genre !== "all";
  const clear = () => {
    setQuery("");
    setLocation("all");
    setDate("all");
    setCategory("all");
    setGenre("all");
  };

  return (
    <>
      <section aria-labelledby="filters-heading" className="bg-[#0b0c10]">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-16">
          <h2 id="filters-heading" className="font-display text-xl font-bold text-white">
            Find your next event
          </h2>
          <div className="mt-3.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,430px)_repeat(4,minmax(0,1fr))] lg:gap-5">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <label className="sr-only" htmlFor="event-search">
                Search by artist or event
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c5c6c7]" />
              <input
                id="event-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by artist or event..."
                className={`${field} pl-12 pr-4 text-sm font-normal placeholder:text-[#c5c6c7]`}
              />
            </div>
            <Select
              label="Location"
              value={location}
              onChange={setLocation}
              options={[{ value: "all", label: "All Locations" }, ...locations.map((l) => ({ value: l, label: l }))]}
            />
            <Select label="Date" value={date} onChange={(v) => setDate(v as DateFilter)} options={DATE_FILTERS} />
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              options={[{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
            <Select
              label="Genre"
              value={genre}
              onChange={setGenre}
              options={[{ value: "all", label: "All Genres" }, ...genres.map((g) => ({ value: g, label: g }))]}
            />
          </div>
        </div>
      </section>

      <div aria-live="polite" className="bg-[#0b0c10]">
        {groups.length === 0 ? (
          <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 text-center sm:px-6 lg:px-16">
            <p className="font-display text-2xl font-bold text-white">No events found</p>
            <p className="mt-2 text-[#c5c6c7]">
              {events.length === 0 ? "There are no upcoming events yet." : "Try changing your search or filters."}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={clear}
                className="mt-6 rounded-full bg-[#66fcf1] px-6 py-3 text-sm font-bold text-[#0b0c10] hover:bg-[#8afff6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} aria-label={g.label} className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-16">
              <h2 className="font-display text-3xl font-bold leading-10 text-white sm:text-4xl">{g.label}</h2>
              <ul className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.items.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}

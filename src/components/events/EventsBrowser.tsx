"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { EventDetails } from "@/types/event";
import FilterSelect from "./FilterSelect";
import EventCard from "./EventCard";
import { DATE_FILTERS, eventLocation, matchesDate, monthKey, uniqueSorted, type DateFilter } from "@/lib/event-filters";

const field =
  "h-[58px] w-full rounded-[14px] border border-[#2c3644] bg-[#1f2833] text-[13px] font-medium text-[#c5c6c7] focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1]";

export default function EventsBrowser({ events, initialQuery = "", initialLocation = "all", initialDate = "all", initialCategory = "all" }: { events: EventDetails[]; initialQuery?: string; initialLocation?: string; initialDate?: string; initialCategory?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState<string>(initialDate);
  const [category, setCategory] = useState(initialCategory);
  const [genre, setGenre] = useState("all");

  const locations = useMemo(() => uniqueSorted([...events.map(eventLocation), ...(initialLocation !== "all" ? [initialLocation] : [])]), [events, initialLocation]);
  const categories = useMemo(() => uniqueSorted([...events.map((e) => e.type), ...(initialCategory !== "all" ? [initialCategory] : [])]), [events, initialCategory]);
  const genres = useMemo(() => uniqueSorted(events.map((e) => e.genre)), [events]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const filtered = events
      .filter((e) => {
        if (q && !`${e.name} ${e.performers.join(" ")}`.toLowerCase().includes(q)) return false;
        if (location !== "all" && !`${eventLocation(e)} ${e.venue.address}`.toLowerCase().includes(location.toLowerCase())) return false;
        if (category !== "all" && e.type !== category) return false;
        if (genre !== "all" && e.genre !== genre) return false;
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(e.startsAt)) === date;
        return matchesDate(e.startsAt, date as DateFilter, now);
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
      <section aria-labelledby="filters-heading" className="bg-[#151b23]">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-16">
          <h2 id="filters-heading" className="font-display text-xl font-bold text-white">
            Find your next event
          </h2>
          {filtersActive && <button type="button" onClick={clear} className="mt-3 text-sm text-[#66fcf1] underline">Clear all filters</button>}
          <div className="mt-3.5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,430px)_repeat(4,minmax(0,1fr))] lg:gap-5">
            <div className="relative sm:col-span-2 xl:col-span-1">
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
            <FilterSelect
              label="Location"
              value={location}
              onChange={setLocation}
              options={[{ value: "all", label: "All Locations" }, ...locations.map((l) => ({ value: l, label: l }))]}
            />
            <FilterSelect label="Date" value={date} onChange={(v) => setDate(v as DateFilter)} options={/^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? [...DATE_FILTERS, { value: initialDate, label: initialDate }] : DATE_FILTERS} />
            <FilterSelect
              label="Category"
              value={category}
              onChange={setCategory}
              options={[{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
            <FilterSelect
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

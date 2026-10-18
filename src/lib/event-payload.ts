import type { EventDetails } from "@/types/event";

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string";
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
const optionalDate = (v: unknown) => v === undefined || date(v);
const image = (v: unknown) => v === undefined || (text(v) && (/^\/(?!\/)/.test(v) || /^https?:\/\//.test(v)));

/** Validate the existing frontend view model; this does not define a backend API. */
export function isEventPayload(v: unknown): v is EventDetails {
  if (!record(v) || !text(v.id) || !text(v.name) || !text(v.type) || !text(v.description)) return false;
  if (!Array.isArray(v.performers) || !v.performers.every(text) || !date(v.startsAt) || !optionalDate(v.endsAt)) return false;
  if (!optionalDate(v.salesStartAt) || !optionalDate(v.salesEndAt) || !image(v.bannerUrl) || !image(v.posterUrl)) return false;
  if (v.gallery !== undefined && (!Array.isArray(v.gallery) || !v.gallery.every(x => text(x) && image(x)))) return false;
  if (!record(v.venue) || !text(v.venue.name) || !text(v.venue.address) || (v.venue.city !== undefined && !text(v.venue.city))) return false;
  if (v.venue.latitude !== undefined && (typeof v.venue.latitude !== "number" || !Number.isFinite(v.venue.latitude) || Math.abs(v.venue.latitude) > 90)) return false;
  if (v.venue.longitude !== undefined && (typeof v.venue.longitude !== "number" || !Number.isFinite(v.venue.longitude) || Math.abs(v.venue.longitude) > 180)) return false;
  if (!record(v.organizer) || !text(v.organizer.name) || (v.organizer.description !== undefined && !text(v.organizer.description))) return false;
  if (!["PUBLISHED", "CANCELLED", "COMPLETED"].includes(String(v.status))) return false;
  if (!Array.isArray(v.categories) || !v.categories.every(c => record(c) && text(c.id) && text(c.name) && (c.description === undefined || text(c.description)) && typeof c.price === "number" && Number.isFinite(c.price) && c.price >= 0 && ["ACTIVE", "DISABLED"].includes(String(c.status)) && ["AVAILABLE", "SOLD_OUT", "NOT_YET_OPEN", "SALE_ENDED"].includes(String(c.availability)) && (c.remaining === undefined || (typeof c.remaining === "number" && Number.isInteger(c.remaining) && c.remaining >= 0)) && optionalDate(c.salesStartAt) && optionalDate(c.salesEndAt))) return false;
  if (v.playlist !== undefined) {
    const p = v.playlist;
    if (!record(p) || !text(p.label) || !text(p.title) || !image(p.coverUrl) || !Array.isArray(p.tracks)) return false;
    if (!p.tracks.every(t => record(t) && text(t.id) && text(t.title) && text(t.artist) && image(t.thumbUrl) && [t.views, t.publishedAgo, t.duration].every(x => x === undefined || text(x)))) return false;
  }
  return v.genre === undefined || text(v.genre);
}

/**
 * Shape of the public event-details payload (GET /events/:id).
 * Agreed contract is still being finalised with the backend; adjust here only.
 * Category `status` is the stored ACTIVE/DISABLED flag. `availability` is
 * derived by the backend (not-yet-open / sale-ended / sold-out / available).
 */
export type EventStatus = "PUBLISHED" | "CANCELLED" | "COMPLETED";
export type CategoryStatus = "ACTIVE" | "DISABLED";
export type CategoryAvailability = "AVAILABLE" | "NOT_YET_OPEN" | "SALE_ENDED" | "SOLD_OUT";

export interface EventSeat {
  id: string;
  section: string;
  row: string;
  seatNumber: string;
  label: string;
}

export interface TicketCategory {
  id: string;
  name: string; // e.g. General Admission, VIP, VVIP
  description?: string;
  price: number; // PHP
  status: CategoryStatus;
  availability: CategoryAvailability;
  remaining?: number;
  admissionMode?: "ASSIGNED_SEATING" | "GENERAL_ADMISSION";
  seats?: EventSeat[]; // Only enabled seats without an active booking or hold.
  salesStartAt?: string; // ISO
  salesEndAt?: string; // ISO
}

export interface EventVenue {
  name: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventOrganizer {
  id?: string;
  name: string;
  description?: string;
}

export interface PlaylistTrack {
  id: string;
  title: string;
  artist: string;
  verified?: boolean;
  views?: string; // e.g. "1.3M views"
  publishedAgo?: string; // e.g. "6 months ago"
  duration?: string; // e.g. "3:05"
  thumbUrl?: string;
}

export interface EventPlaylist {
  label: string;
  title: string;
  coverUrl?: string;
  tracks: PlaylistTrack[];
}

export interface EventDetails {
  id: string;
  name: string;
  performers: string[];
  type: string; // Concert, Festival, Gig...
  genre?: string; // Pop, Rock, Hip-Hop...
  description: string;
  bannerUrl?: string;
  posterUrl?: string;
  gallery?: string[]; // promotional images
  startsAt: string; // ISO
  endsAt?: string; // ISO
  venue: EventVenue;
  organizer: EventOrganizer;
  status: EventStatus;
  salesStartAt?: string;
  salesEndAt?: string;
  categories: TicketCategory[];
  playlist?: EventPlaylist;
}

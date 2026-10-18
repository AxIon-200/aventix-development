/**
 * Types for Guest / Public Domain
 */

export interface PublicEventItem {
  id: string;
  title: string;
  category: string;
  date: string;
  venue: string;
  location: string;
  price: string;
  image: string;
  status?: "upcoming" | "selling-fast" | "sold-out";
  organizer?: {
    name: string;
    verified: boolean;
  };
}

export interface PublicCategoryItem {
  id: string;
  name: string;
  iconName: string;
  eventCount: number;
  slug: string;
}

export interface PublicSearchFilters {
  query?: string;
  location?: string;
  category?: string;
  dateRange?: string;
}

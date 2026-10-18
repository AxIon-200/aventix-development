import { PublicEventItem } from "@/types/guest";

export const samplePublicEvents: PublicEventItem[] = [
  {
    id: "ev-001",
    title: "Electric Pulse Rave 2026",
    category: "Concert",
    date: "2026-11-15",
    venue: "Mall of Asia Arena",
    location: "Pasay City",
    price: "₱2,500",
    image: "/images/wave_to_earth.jpg",
    status: "selling-fast",
    organizer: {
      name: "Aventix Live",
      verified: true,
    },
  },
  {
    id: "ev-002",
    title: "Sunset Jazz & Arts Festival",
    category: "Festival",
    date: "2026-12-02",
    venue: "Riverside Park",
    location: "Marikina City",
    price: "₱1,800",
    image: "/images/charlie_puth.jpg",
    status: "upcoming",
    organizer: {
      name: "Metro Arts Collective",
      verified: true,
    },
  },
];

export async function getPublicEvents(): Promise<PublicEventItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/guest/events`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
    } catch {
      // fallback
    }
  }
  return samplePublicEvents;
}

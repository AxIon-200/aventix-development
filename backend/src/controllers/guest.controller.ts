import { Request, Response } from "express";

export const getPublicEvents = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: [
      {
        id: "ev-001",
        title: "Electric Pulse Rave 2026",
        category: "Concert",
        date: "2026-11-15",
        venue: "Mall of Asia Arena",
        location: "Pasay City",
        price: "₱2,500",
        image: "/images/wave_to_earth.jpg",
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
      },
    ],
  });
};

export const getEventCategories = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: [
      { id: "cat-1", name: "Concerts", slug: "concerts", eventCount: 14 },
      { id: "cat-2", name: "Festivals", slug: "festivals", eventCount: 8 },
      { id: "cat-3", name: "Conferences", slug: "conferences", eventCount: 6 },
      { id: "cat-4", name: "Sports", slug: "sports", eventCount: 10 },
    ],
  });
};

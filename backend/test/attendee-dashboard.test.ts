import { beforeEach, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("../src/lib/prisma.js", () => ({ prisma: { booking: { findMany } } }));
import { attendeeRouter } from "../src/routes/attendee.routes.js";

function appFor(role = "ATTENDEE", status = 200) {
  const auth = { api: { readOwnProfile: vi.fn(async () => Response.json(status === 200
    ? { data: { user: { id: "current-attendee", role } } }
    : { error: { code: "AUTHENTICATION_REQUIRED" } }, { status })) } };
  const app = express();
  app.use("/api/v1/attendee", attendeeRouter(auth as unknown as Parameters<typeof attendeeRouter>[0]));
  return app;
}

beforeEach(() => { findMany.mockReset(); });

it("uses the authenticated attendee identity, ignores requested user IDs and returns actual records", async () => {
  findMany.mockResolvedValue([{
    id: "booking-1", bookingReference: "BKG-1", eventId: "event-1", status: "CONFIRMED",
    createdAt: new Date("2026-10-01"), expiresAt: new Date("2026-10-01T00:15:00Z"), totalAmount: "200.50",
    event: { name: "Concert", status: "PUBLISHED", startTime: new Date("2026-11-01"), venue: { name: "Venue" } },
    payments: [
      { status: "PAID", amount: "200.50" }, { status: "FAILED", amount: "200.50" },
      { status: "PENDING", amount: "200.50" }, { status: "REFUNDED", amount: "100.00" },
    ],
    items: [{ quantity: 2, ticketCategory: { name: "VIP" }, tickets: [{ id: "ticket-1", ticketCode: "T1", status: "VALID" }] }],
  }]);
  const response = await request(appFor()).get("/api/v1/attendee/dashboard?userId=someone-else");
  expect(response.status).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(findMany.mock.calls[0]![0].where).toEqual({ userId: "current-attendee" });
  expect(response.body.data.userId).toBe("current-attendee");
  expect(response.body.data.bookings[0]).toMatchObject({ paidCentavos: 20050, totalCentavos: 20050, quantity: 2,
    overdue: false });
  expect(response.body.data.bookings[0].tickets).toHaveLength(1);
  expect(JSON.stringify(response.body)).not.toContain("verificationToken");
});

it("returns empty records for a new attendee without samples", async () => {
  findMany.mockResolvedValue([]);
  expect((await request(appFor()).get("/api/v1/attendee/dashboard")).body).toEqual({ data: { userId: "current-attendee", bookings: [] } });
});

it.each([["ATTENDEE", 401, 401], ["ORGANIZER", 200, 403], ["ADMINISTRATOR", 200, 403]])(
  "denies unauthorized access for %s with authentication status %s", async (role, status, expected) => {
    expect((await request(appFor(role, status)).get("/api/v1/attendee/dashboard")).status).toBe(expected);
    expect(findMany).not.toHaveBeenCalled();
  },
);

it("reports database failure instead of inventing zero or sample totals", async () => {
  findMany.mockRejectedValue(new Error("database unavailable"));
  expect((await request(appFor()).get("/api/v1/attendee/dashboard")).status).toBe(500);
});

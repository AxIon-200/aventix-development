import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./load-typescript.mjs";
const { summarizeAttendee, parseDemoBookings, demoStorageKey, money } = load("src/lib/attendee-records.ts");

const now = new Date("2026-10-24T10:00:00Z");
const booking = (changes = {}) => ({
  id: "booking-1", reference: "BKG-1", eventId: "event-1", eventTitle: "Test concert",
  startsAt: "2026-10-30T12:00:00Z", eventStatus: "PUBLISHED", venue: "Test venue",
  status: "CONFIRMED", createdAt: "2026-10-20T10:00:00Z", paidCentavos: 10050,
  totalCentavos: 10050, quantity: 2,
  tickets: [{ id: "ticket-1", status: "VALID", code: "T1", tier: "VIP" }, { id: "ticket-2", status: "USED", code: "T2", tier: "VIP" }],
  ...changes,
});

test("empty attendee has no invented tickets, purchases or rewards", () => {
  const summary = summarizeAttendee([], now);
  assert.equal(summary.ticketCount, 0);
  assert.equal(summary.spentCentavos, 0);
  assert.equal(summary.bookingCount, 0);
  assert.deepEqual(summary.upcoming, []);
  assert.equal("rewardPoints" in summary, false);
});

test("tickets count actual issued tickets, spending counts payments once and events are unique", () => {
  const summary = summarizeAttendee([booking(), booking({ id: "booking-2", quantity: 5, tickets: [{ status: "VALID" }] })], now);
  assert.equal(summary.ticketCount, 3);
  assert.equal(summary.spentCentavos, 20100);
  assert.equal(summary.upcoming.length, 1);
  assert.equal(summary.eventsThisMonth, 1);
  assert.equal(summary.bookingCount, 2);
  assert.equal(money(10050), "₱100.50");
});

test("refunded, cancelled, expired and demo records do not inflate issued tickets or real spend", () => {
  const demo = booking({ id: "demo-1", simulation: true, status: "DEMO", paidCentavos: 0, tickets: [], quantity: 3 });
  const summary = summarizeAttendee([
    booking({ status: "REFUNDED" }), booking({ status: "CANCELLED", paidCentavos: 0 }),
    booking({ status: "EXPIRED", paidCentavos: 0 }), demo,
  ], now);
  assert.equal(summary.ticketCount, 0);
  assert.equal(summary.spentCentavos, 0);
  assert.equal(summary.upcoming.length, 0);
  assert.equal(summary.demoQuantity, 3);
  assert.equal(summary.demoCentavos, 10050);
  assert.equal(summary.bookingCount, 3);
});

test("upcoming excludes used tickets, cancelled events and past dates; month follows Manila time", () => {
  const summary = summarizeAttendee([
    booking({ tickets: [{ status: "USED" }] }), booking({ eventStatus: "CANCELLED" }),
    booking({ startsAt: "2026-10-01T10:00:00Z" }),
    booking({ id: "november", startsAt: "2026-10-31T18:00:00Z" }),
  ], now);
  assert.equal(summary.upcoming.length, 1);
  assert.equal(summary.eventsThisMonth, 0);
});

test("demo storage is scoped by attendee, rejects corrupt records and deduplicates attempts", () => {
  assert.notEqual(demoStorageKey("attendee-a"), demoStorageKey("attendee-b"));
  const demo = booking({ simulation: true, status: "DEMO", paidCentavos: 0, tickets: [] });
  assert.equal(parseDemoBookings(JSON.stringify([demo, demo])).length, 1);
  for (const value of ["broken", "{}", JSON.stringify([booking()]), JSON.stringify([{ ...demo, quantity: -1 }]), JSON.stringify([{ ...demo, startsAt: "broken" }])]) {
    assert.deepEqual(parseDemoBookings(value), []);
  }
});

test("simulation-only purchases populate dashboard tickets, totals, bookings and upcoming events", () => {
  const demo = booking({ simulation: true, status: "DEMO", paidCentavos: 0, tickets: [], quantity: 3, totalCentavos: 150075 });
  const summary = summarizeAttendee(parseDemoBookings(JSON.stringify([demo])), now);
  assert.equal(summary.displayedTicketCount, 3);
  assert.equal(summary.displayedSpentCentavos, 150075);
  assert.equal(summary.displayedBookingCount, 1);
  assert.equal(summary.displayedUpcoming.length, 1);
  assert.equal(summary.displayedUpcoming[0].simulation, true);
  assert.equal(summary.displayedEventsThisMonth, 1);
  assert.equal(summary.spentCentavos, 0);
  assert.equal(summary.ticketCount, 0);
});

test("mixed purchases add simulated quantity and amount once while keeping real spending separate", () => {
  const demo = booking({ id: "demo", simulation: true, status: "DEMO", paidCentavos: 0, tickets: [], quantity: 4, totalCentavos: 20025 });
  const summary = summarizeAttendee([booking(), demo], now);
  assert.equal(summary.displayedTicketCount, 6);
  assert.equal(summary.displayedSpentCentavos, 30075);
  assert.equal(summary.spentCentavos, 10050);
  assert.equal(summary.demoCentavos, 20025);
  assert.equal(summary.displayedBookingCount, 2);
  assert.equal(summary.displayedUpcoming.length, 1);
  assert.equal(summary.displayedUpcoming[0].simulation, undefined);
});

test("past and cancelled simulated events stay out of upcoming but retain purchase history totals", () => {
  const demo = booking({ simulation: true, status: "DEMO", paidCentavos: 0, tickets: [] });
  const summary = summarizeAttendee([
    { ...demo, startsAt: "2026-10-01T00:00:00Z" },
    { ...demo, id: "cancelled", eventStatus: "CANCELLED" },
    { ...demo, id: "november", startsAt: "2026-10-31T18:00:00Z" },
  ], now);
  assert.equal(summary.displayedUpcoming.length, 1);
  assert.equal(summary.displayedEventsThisMonth, 0);
  assert.equal(summary.displayedTicketCount, 6);
  assert.equal(summary.displayedSpentCentavos, 30150);
});

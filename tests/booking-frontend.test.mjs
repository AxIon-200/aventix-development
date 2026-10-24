import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./load-typescript.mjs";
const { MOCK_EVENTS } = load("tests/fixtures/mock-events.ts");
const {
  validateDraft,
  remainingAllowance,
  toggleSeat,
  refreshDraft,
  setQuantity,
  secondsRemaining,
  canPay,
  canCancel,
  isConfirmed,
  reconcileBooking,
  trustedPaymentUrl,
  parseDraft,
  assertMatchesDraft,
} = load("src/lib/booking/rules.ts");
const { requireBooking, requireOptions, requireSeats } = load(
  "src/lib/booking/validate.ts",
);
const { safeReturnTo } = load("src/lib/auth/destination.ts");
const event = structuredClone(MOCK_EVENTS[0]);
const options = {
  event,
  purchaseLimit: 4,
  confirmedQuantity: 1,
  heldQuantity: 1,
};
const seats = [1, 2, 3].map((n) => ({
  id: `seat-${n}`,
  eventId: event.id,
  ticketCategoryId: event.categories[0].id,
  section: "Main",
  row: "A",
  seatNumber: String(n),
  displayLabel: `A${n}`,
  status: "AVAILABLE",
}));
const draft = {
  version: 1,
  eventId: event.id,
  items: [
    {
      ticketCategoryId: event.categories[0].id,
      quantity: 2,
      seatIds: ["seat-1", "seat-2"],
    },
  ],
};
const booking = {
  id: "booking-1",
  reference: "TEST-ONLY",
  event: {
    id: event.id,
    name: event.name,
    startsAt: event.startsAt,
    venue: event.venue,
    status: event.status,
  },
  attendee: { name: "Test attendee", email: "test@example.invalid" },
  status: "PENDING_PAYMENT",
  paymentStatus: "PENDING",
  items: [
    {
      ticketCategoryId: event.categories[0].id,
      name: "Test category",
      quantity: 2,
      unitPrice: 2200,
      seats: [
        { id: "seat-1", displayLabel: "A1" },
        { id: "seat-2", displayLabel: "A2" },
      ],
    },
  ],
  subtotal: 4400,
  fees: [],
  total: 4400,
  currency: "PHP",
  expiresAt: "2026-10-18T10:08:00Z",
  serverNow: "2026-10-18T10:03:00Z",
  canPay: true,
  canCancel: true,
};

test("cumulative confirmed tickets and active holds constrain every selected category", () => {
  assert.equal(remainingAllowance(options), 2);
  assert.deepEqual(validateDraft(draft, options, seats), []);
  assert.ok(
    validateDraft(
      { ...draft, items: [{ ...draft.items[0], quantity: 3 }] },
      options,
    ).some((x) => x.includes("allowance")),
  );
  assert.ok(validateDraft({ ...draft, eventId: "other" }, options).length);
  assert.ok(
    validateDraft(
      { ...draft, items: [...draft.items, ...draft.items] },
      options,
    ).length,
  );
  assert.ok(
    validateDraft(
      { ...draft, items: [{ ...draft.items[0], quantity: 1.5 }] },
      options,
    ).length,
  );
});
test("numbered seats must match count, category, event, uniqueness and effective availability", () => {
  assert.ok(
    validateDraft(
      { ...draft, items: [{ ...draft.items[0], seatIds: ["seat-1"] }] },
      options,
      seats,
    ).length,
  );
  assert.ok(
    validateDraft(
      {
        ...draft,
        items: [{ ...draft.items[0], seatIds: ["seat-1", "seat-1"] }],
      },
      options,
      seats,
    ).length,
  );
  for (const changed of [
    { status: "HELD" },
    { status: "SOLD" },
    { status: "DISABLED" },
    { eventId: "other" },
    { ticketCategoryId: "wrong" },
  ])
    assert.ok(
      validateDraft(draft, options, [
        { ...seats[0], ...changed },
        ...seats.slice(1),
      ]).length,
    );
});
test("seat toggles respect category quantity and refresh removes conflicting choices", () => {
  const empty = { ...draft, items: [{ ...draft.items[0], seatIds: [] }] };
  let next = toggleSeat(toggleSeat(empty, seats[0]), seats[1]);
  assert.equal(next.items[0].seatIds.length, 2);
  assert.equal(toggleSeat(next, seats[2]).items[0].seatIds.length, 2);
  next = toggleSeat(next, seats[0]);
  assert.deepEqual(next.items[0].seatIds, ["seat-2"]);
  assert.deepEqual(
    refreshDraft(draft, [{ ...seats[0], status: "HELD" }, ...seats.slice(1)])
      .items[0].seatIds,
    ["seat-2"],
  );
  assert.deepEqual(
    setQuantity(draft, event.categories[0].id, 1).items[0].seatIds,
    [],
  );
});
test("draft persistence allowlists selection fields and never persists prices or customer data", () => {
  const parsed = parseDraft(
    { ...draft, total: 0, attendee: { name: "secret" }, role: "ADMIN" },
    event.id,
  );
  assert.deepEqual(Object.keys(parsed).sort(), ["eventId", "items", "version"]);
  assert.equal(parseDraft(draft, "other"), undefined);
  assert.equal(
    parseDraft(
      { ...draft, items: [{ ...draft.items[0], quantity: -1 }] },
      event.id,
    ),
    undefined,
  );
});
test("reservation countdown uses server timestamps and never renews a deadline locally", () => {
  assert.equal(secondsRemaining(booking, 0), 300);
  assert.equal(secondsRemaining(booking, 90000), 210);
  assert.equal(secondsRemaining(booking, 900000), 0);
  assert.equal(canPay(booking, 0), false);
  assert.equal(canCancel(booking, 0), false);
  const confirmed = { ...booking, status: "CONFIRMED", paymentStatus: "PAID" };
  assert.equal(isConfirmed(confirmed), true);
  assert.equal(canPay(confirmed, 100), false);
  assert.equal(canCancel(confirmed, 100), false);
  assert.equal(
    isConfirmed({ ...booking, status: "CONFIRMED", paymentStatus: "FAILED" }),
    false,
  );
  assert.equal(
    isConfirmed({ ...booking, status: "CANCELLED", paymentStatus: "PAID" }),
    false,
  );
  assert.equal(
    isConfirmed({
      ...confirmed,
      event: { ...booking.event, status: "CANCELLED" },
    }),
    false,
  );
});
test("refresh cannot extend expiry, regress paid state or revive a released booking", () => {
  assert.throws(
    () =>
      reconcileBooking(booking, {
        ...booking,
        serverNow: "2026-10-18T10:02:00Z",
      }),
    /CONTRACT_MISMATCH/,
  );
  assert.throws(
    () =>
      reconcileBooking(booking, {
        ...booking,
        expiresAt: "2026-10-18T10:18:00Z",
      }),
    /CONTRACT_MISMATCH/,
  );
  const paid = { ...booking, status: "CONFIRMED", paymentStatus: "PAID" };
  assert.throws(
    () => reconcileBooking(paid, { ...paid, paymentStatus: "FAILED" }),
    /CONTRACT_MISMATCH/,
  );
  assert.throws(
    () => reconcileBooking({ ...booking, status: "EXPIRED" }, paid),
    /CONTRACT_MISMATCH/,
  );
  assert.throws(
    () => reconcileBooking({ ...booking, status: "CANCELLED" }, booking),
    /CONTRACT_MISMATCH/,
  );
  assert.equal(
    reconcileBooking(paid, {
      ...paid,
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
    }).status,
    "REFUNDED",
  );
});
test("server-created booking must contain exactly the requested seat allocations", () => {
  assert.doesNotThrow(() => assertMatchesDraft(booking, draft));
  assert.throws(
    () =>
      assertMatchesDraft(
        {
          ...booking,
          items: [
            {
              ...booking.items[0],
              seats: [
                { id: "unknown", displayLabel: "B1" },
                { id: "seat-2", displayLabel: "A2" },
              ],
            },
          ],
        },
        draft,
      ),
    /CONTRACT_MISMATCH/,
  );
  assert.throws(
    () =>
      assertMatchesDraft(
        { ...booking, event: { ...booking.event, id: "other" } },
        draft,
      ),
    /CONTRACT_MISMATCH/,
  );
});
test("booking and seat response validation rejects inconsistent service payloads", () => {
  assert.equal(requireBooking(booking).id, booking.id);
  assert.equal(requireOptions(options, event.id).event.id, event.id);
  assert.equal(requireSeats(seats, options).length, 3);
  assert.throws(
    () => requireBooking({ ...booking, total: 1 }),
    /CONTRACT_MISMATCH/,
  );
  assert.throws(
    () =>
      requireBooking({
        ...booking,
        attendee: { ...booking.attendee, phoneNumber: {} },
      }),
    /CONTRACT_MISMATCH/,
  );
  assert.throws(
    () => requireSeats([...seats, seats[0]], options),
    /CONTRACT_MISMATCH/,
  );
});
test("payment links need an explicitly trusted HTTPS origin and booking returns stay local", () => {
  assert.equal(
    trustedPaymentUrl("https://pay.example.invalid/checkout", [
      "https://pay.example.invalid",
    ]),
    "https://pay.example.invalid/checkout",
  );
  for (const url of [
    "javascript:alert(1)",
    "http://pay.example.invalid/",
    "https://evil.invalid/",
    "https://user:pass@pay.example.invalid/",
  ])
    assert.equal(
      trustedPaymentUrl(url, ["https://pay.example.invalid"]),
      undefined,
    );
  assert.equal(safeReturnTo("/bookings/b1/payment"), "/bookings/b1/payment");
  assert.equal(safeReturnTo("/bookings/b1/payment?success=true"), undefined);
  assert.equal(safeReturnTo("/events/e1/seats"), "/events/e1/seats");
});

const { formatBookingAmount } = load("src/lib/booking/format.ts");
test("booking amounts preserve centavos and show configured fees precisely", () => {
  assert.ok(formatBookingAmount(100.25).includes("100.25"));
  assert.ok(formatBookingAmount(2200).includes("2,200.00"));
});

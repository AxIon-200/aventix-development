import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { load, root } from './load-typescript.mjs';
import path from 'node:path';

const require = createRequire(import.meta.url);
function compile(file, resolve) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', code)(resolve, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

test('public event stock retains pending holds until provider expiry is confirmed', async () => {
  const past = new Date(Date.now() - 60000), future = new Date(Date.now() + 60000);
  const item = (quantity, status, expiresAt) => ({ quantity, booking: { status, expiresAt } });
  const category = {
    id: 'tier', name: 'Floor', status: 'ACTIVE', maxCapacity: 5,
    admissionMode: 'GENERAL_ADMISSION', seats: [],
    price: { toNumber: () => 1000 },
    bookingItems: [
      item(3, 'CONFIRMED', past), item(1, 'PENDING_PAYMENT', future),
      item(9, 'PENDING_PAYMENT', past),
    ],
  };
  const event = {
    id: 'concert', name: 'Concert', status: 'PUBLISHED', startTime: future,
    venue: { name: 'Arena', address: 'Manila' }, organizer: { id: 'org', organizationName: 'Organizer' },
    media: [], ticketCategories: [category],
  };
  const read = async query => {
    assert.deepEqual(query.include.ticketCategories.include.bookingItems.where.booking.status.in,
      ['CONFIRMED', 'PENDING_PAYMENT']);
    return event;
  };
  const { PublicEventsService } = compile('backend/src/services/public-events.service.ts', () => ({
    prisma: { event: { findUnique: read, findMany: async query => [await read(query)] } },
  }));
  let result = await PublicEventsService.get(event.id);
  assert.equal(result.categories[0].remaining, 0);
  assert.equal(result.categories[0].availability, 'SOLD_OUT');
  assert.equal((await PublicEventsService.list())[0].categories[0].remaining, 0);
  category.maxCapacity = 4;
  result = await PublicEventsService.get(event.id);
  assert.equal(result.categories[0].remaining, 0);
  assert.equal(result.categories[0].availability, 'SOLD_OUT');
  category.maxCapacity = 1;
  assert.equal((await PublicEventsService.get(event.id)).categories[0].remaining, 0);
  category.maxCapacity = null;
  assert.equal('remaining' in (await PublicEventsService.get(event.id)).categories[0], false);
  event.status = 'SOLD_OUT';
  assert.equal((await PublicEventsService.get(event.id)).categories[0].remaining, 0);
});

test('assigned seating retains pending allocations until the booking is explicitly expired', async () => {
  const past = new Date(Date.now() - 60000), future = new Date(Date.now() + 60000);
  const seat = (id, allocationStatus, status, expiresAt) => ({
    id, section: 'Floor', row: '01', seatNumber: id, displayLabel: `Seat ${id}`,
    bookingSeats: allocationStatus ? [{ allocationStatus, bookingItem: { booking: { status, expiresAt } } }] : [],
  });
  const event = {
    id: 'concert', name: 'Concert', status: 'PUBLISHED', startTime: future,
    venue: { name: 'Arena', address: 'Manila' }, organizer: { id: 'org', organizationName: 'Organizer' }, media: [],
    ticketCategories: [{
      id: 'tier', name: 'Floor', status: 'ACTIVE', maxCapacity: 20,
      admissionMode: 'ASSIGNED_SEATING', price: { toNumber: () => 1000 }, bookingItems: [],
      seats: [seat('free'), seat('confirmed', 'CONFIRMED', 'CONFIRMED', past),
        seat('held', 'HELD', 'PENDING_PAYMENT', future), seat('expired', 'HELD', 'PENDING_PAYMENT', past),
        seat('released', 'RELEASED', 'CONFIRMED', past), seat('cancelled', 'HELD', 'CANCELLED', future)],
    }],
  };
  const { PublicEventsService } = compile('backend/src/services/public-events.service.ts', () => ({
    prisma: { event: { findUnique: async query => {
      assert.equal(query.include.ticketCategories.include.seats.where.enabled, true);
      return event;
    } } },
  }));
  const result = await PublicEventsService.get(event.id);
  assert.deepEqual(result.categories[0].seats.map(seat => seat.id), ['free', 'released', 'cancelled']);
  assert.equal(result.categories[0].remaining, 3);
  event.ticketCategories[0].seats[3].bookingSeats[0].bookingItem.booking.status = 'EXPIRED';
  assert.equal((await PublicEventsService.get(event.id)).categories[0].seats.some(s => s.id === 'expired'), true);
  assert.equal(result.categories[0].seats[0].bookingSeats, undefined);
});

test('quantity cannot exceed remaining stock, including repeated increment calls', () => {
  const React = require('react');
  let state = [], index = 0;
  const react = { ...React, useRef: initial => ({ current: initial }), useState(initial) {
    const position = index++;
    if (!(position in state)) state[position] = initial;
    return [state[position], value => {
      state[position] = typeof value === 'function' ? value(state[position]) : value;
    }];
  } };
  const { default: Flow } = compile('src/components/booking/InteractiveTicketFlow.tsx', id =>
    id === 'react' ? react : id === 'next/navigation' ? { useRouter: () => ({ push() {} }) } : id === '@/lib/booking/client' ? load('src/lib/booking/client.ts') : id === '@/lib/event-booking' ? load('src/lib/event-booking.ts')
      : id.startsWith('./') ? { __esModule: true, default: () => null, DEFAULT_ETICKET_DATA: {} } : require(id));
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten)
    : node && typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
  const event = {
    id: 'concert', name: 'Concert', status: 'PUBLISHED', type: 'Concert', performers: [],
    startsAt: '2027-01-01T12:00:00Z', venue: { name: 'Arena', address: 'Manila' },
    categories: [{ id: 'tier', name: 'Floor', status: 'ACTIVE', availability: 'AVAILABLE', price: 1000, remaining: 1 }],
  };
  const render = () => { index = 0; return flatten(Flow({ events: [event] })); };
  const increase = () => render().find(node => node.props?.['aria-label'] === 'Increase ticket quantity');
  const quantity = () => render().find(node => node.type === 'span' && node.props.className?.includes('w-5 text-center'))
    .props.children;
  // Enter Select Tickets through the performance details action.
  render().find(node => node.type === 'button' && node.props.children?.[0]?.props?.children === 'Continue to Ticket Selection')
    .props.onClick();
  assert.equal(increase().props.disabled, true);
  for (let i = 0; i < 10; i++) increase().props.onClick();
  assert.equal(quantity(), 1);
  event.categories[0].remaining = 2;
  increase().props.onClick();
  assert.equal(quantity(), 2);
  assert.equal(increase().props.disabled, true);
  event.categories[0].remaining = 20;
  for (let i = 0; i < 10; i++) increase().props.onClick();
  assert.equal(quantity(), 6);
  assert.equal(increase().props.disabled, true);
  event.categories[0].remaining = 1;
  assert.equal(increase().props.disabled, true);
  increase().props.onClick();
  assert.equal(quantity(), 1);
  event.categories[0].remaining = 0;
  assert.equal(increase().props.disabled, true);
});

test('multiple seats must match ticket quantity before checkout and reset when quantity changes', () => {
  const React = require('react');
  let state = [], index = 0;
  const react = { ...React, useRef: initial => ({ current: initial }), useState(initial) {
    const position = index++;
    if (!(position in state)) state[position] = initial;
    return [state[position], value => {
      state[position] = typeof value === 'function' ? value(state[position]) : value;
    }];
  } };
  const { default: Flow } = compile('src/components/booking/InteractiveTicketFlow.tsx', id =>
    id === 'react' ? react : id === 'next/navigation' ? { useRouter: () => ({ push() {} }) } : id === '@/lib/booking/client' ? load('src/lib/booking/client.ts') : id === '@/lib/event-booking' ? load('src/lib/event-booking.ts')
      : id.startsWith('./') ? { __esModule: true, default: () => null, DEFAULT_ETICKET_DATA: {} } : require(id));
  const { default: SeatMap } = compile('src/components/booking/InteractiveSeatMap.tsx', require);
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten)
    : node && typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
  const text = node => Array.isArray(node) ? node.map(text).join('')
    : node && typeof node === 'object' ? text(node.props?.children) : node ?? '';
  const seats = Array.from({ length: 4 }, (_, index) => ({
    id: String(index + 1), section: 'Floor', row: '01', seatNumber: String(index + 1), label: `Floor Seat ${index + 1}`,
  }));
  const event = {
    id: 'concert', name: 'Concert', status: 'PUBLISHED', type: 'Concert', performers: [],
    startsAt: '2027-01-01T12:00:00Z', venue: { name: 'Arena', address: 'Manila' },
    categories: [{ id: 'tier', name: 'Floor', status: 'ACTIVE', availability: 'AVAILABLE',
      admissionMode: 'ASSIGNED_SEATING', price: 1000, remaining: 4, seats }],
  };
  let tree;
  const attendee = { name: 'Test Attendee', email: 'attendee@example.invalid', phoneNumber: '+63 900 000 0000' };
  const render = () => { index = 0; tree = flatten(Flow({ events: [event], attendee })); };
  const button = label => tree.find(node => node.type === 'button' && text(node).includes(label));
  const click = label => { const target = button(label); assert.ok(target, label); target.props.onClick(); render(); };
  const map = () => tree.find(node => typeof node.props?.onSeatToggle === 'function').props;
  render();
  click('Continue to Ticket Selection');
  click('+'); click('+');
  click('Select Numbered Seats');
  assert.equal(map().quantity, 3);
  assert.equal(button('Proceed to Attendee Checkout').props.disabled, true);
  click('Proceed to Attendee Checkout'); // Guard also applies if the handler is invoked directly.
  assert.ok(map());
  for (const seat of seats.slice(0, 3)) { map().onSeatToggle(seat); render(); }
  assert.equal(map().selectedSeats.length, 3);
  map().onSeatToggle(seats[3]); render();
  assert.equal(map().selectedSeats.length, 3);
  const seatTree = flatten(SeatMap(map()));
  assert.ok(text(seatTree[0]).includes('Selected seats: 3 / 3'));
  assert.equal(seatTree.filter(node => node.type === 'button' && node.props['aria-pressed']).length, 3);
  assert.equal(seatTree.find(node => node.props?.['aria-label'] === seats[3].label).props.disabled, true);
  map().onSeatToggle(seats[1]); render();
  assert.equal(map().selectedSeats.length, 2);
  assert.equal(button('Proceed to Attendee Checkout').props.disabled, true);
  map().onSeatToggle({ ...seats[0], id: 'unavailable-seat' }); render();
  assert.equal(map().selectedSeats.length, 2);
  map().onSeatToggle(seats[1]); render();
  assert.equal(button('Proceed to Attendee Checkout').props.disabled, false);
  click('Proceed to Attendee Checkout');
  for (const seat of seats.slice(0, 3)) assert.ok(text(tree[0]).includes(seat.label));
  for (const [id, value] of Object.entries({
    'ticket-holder-name': attendee.name, 'attendee-email': attendee.email, 'attendee-phone': attendee.phoneNumber,
  })) {
    const field = tree.find(node => node.props?.id === id);
    assert.equal(field.props.value, value);
    assert.equal(field.props.readOnly, true);
    assert.equal(field.props.onChange, undefined);
  }
  assert.ok(text(tree[0]).includes('Ticket quantity:3'));
  assert.ok(text(tree[0]).includes('Selected seats (3):'));
  assert.ok(text(tree[0]).includes('Subtotal (3 × PHP 1,000.00)PHP 3,000.00'));
  assert.ok(text(tree[0]).includes('Jan 1, 2027'));
  assert.ok(text(tree[0]).includes('08:00 PM'));
  for (const [label, method] of [['Maya', 'Maya'], ['Credit / Debit', 'Card'], ['GCash', 'GCash']]) {
    tree.find(node => node.type === 'button' && text(node).includes(label)).props.onClick();
    render();
    assert.ok(text(tree[0]).includes(`Payment method: ${method}`));
  }
  click('Back to Seat Selection');
  click('Back to Ticket Tiers');
  click('-');
  click('Select Numbered Seats');
  assert.equal(map().quantity, 2);
  assert.equal(map().selectedSeats.length, 0);
  assert.equal(button('Proceed to Attendee Checkout').props.disabled, true);
  for (const seat of seats.slice(0, 2)) { map().onSeatToggle(seat); render(); }
  click('Proceed to Attendee Checkout');
  assert.ok(text(tree[0]).includes('Ticket quantity:2'));
  assert.ok(text(tree[0]).includes('Selected seats (2):'));
  assert.ok(text(tree[0]).includes('Subtotal (2 × PHP 1,000.00)PHP 2,000.00'));
  assert.ok(!text(tree[0]).includes(seats[2].label));
});

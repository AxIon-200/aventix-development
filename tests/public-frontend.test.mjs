/* Run with: node --test tests/public-frontend.test.mjs (no additional packages). */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { load, cache, root } from './load-typescript.mjs';
const { safeReturnTo, authHref } = load('src/lib/auth/destination.ts');
const { validPhone, attendeePayload, passwordError, validEmail } = load('src/lib/auth/validation.ts');
const { getBookingState, bookingHref, isCategoryBookable } = load('src/lib/event-booking.ts');
const { isEventPayload } = load('src/lib/event-payload.ts');
const { MOCK_EVENTS } = load('src/lib/mock-events.ts');
const { matchesDate } = load('src/lib/event-filters.ts');

test('booking return survives auth links without admitting external or privileged destinations', () => {
  const target = bookingHref('event 1', 'cat/2');
  assert.equal(safeReturnTo(target), target);
  assert.equal(new URL(authHref('/login', target), 'https://test.invalid').searchParams.get('returnTo'), target);
  for (const input of ['https://evil.test', '//evil.test', '/admin', '/events/../admin', '/events/%2e%2e/tickets', '/events/%5cevil/tickets', '/events/foo#fragment', '/events/foo?category=x&role=admin', 'javascript:alert(1)', '/events/%0Afoo', '/events/%2f%2fevil']) assert.equal(safeReturnTo(input), undefined, input);
  for (const input of ['/dashboard', '/dashboard/buy-tickets', '/dashboard/buy-tickets?eventId=', '/dashboard/buy-tickets?eventId=x&role=admin', '/dashboard/buy-tickets?eventId=x&eventId=y', '/dashboard/buy-tickets?eventId=%0ax']) assert.equal(safeReturnTo(input), undefined, input);
});
test('registration allowlists account fields and excludes confirmation and privileges', () => {
  const data = new FormData();
  for (const [k, v] of Object.entries({ firstName:' Ana ', lastName:' Cruz ', email:' ana@example.com ', phoneNumber:'0917 123 4567', password:'strong-pass', confirmPassword:'strong-pass', terms:'on', role:'ADMIN', isOrganizer:'true' })) data.set(k, v);
  data.set('phoneNumber', '09171234567');
  data.set('email', ' ANA+tag@EXAMPLE.com ');
  data.set('termsVersion', 'tampered');
  assert.deepEqual(attendeePayload(data, 'fixture-v1'), { firstName:'Ana', lastName:'Cruz', email:'ana+tag@example.com', phoneNumber:'09171234567', password:'strong-pass', termsAccepted:true, termsVersion:'fixture-v1' });
  data.set('phoneNumber', ''); data.delete('terms');
  const payload = attendeePayload(data, 'fixture-v2');
  assert.equal(Object.hasOwn(payload, 'phoneNumber'), false);
  assert.equal(payload.termsAccepted, false);
  assert.equal(payload.termsVersion, 'fixture-v2');
});
test('contact and exact Unicode password validation follow the registration contract', () => {
  for (const phone of ['09171234567', '+639171234567']) assert.equal(validPhone(phone), true);
  for (const phone of ['+63 (917) 123-4567', '0917 123 4567', '0917-123-4567', '639171234567', '+14155552671', '0291234567', '０９１７１２３４５６７', ' 09171234567']) assert.equal(validPhone(phone), false, phone);
  assert.equal(validPhone('not-a-number'), false);
  assert.equal(validPhone('12345'), false);
  assert.equal(validEmail('bad@'), false);
  assert.equal(validEmail('a@example.com'), true);
  for (const password of ['a'.repeat(14), '🔒'.repeat(14), 'a'.repeat(129), '🔒'.repeat(129), '\ud800'.repeat(15)]) assert.ok(passwordError(password));
  for (const password of [' '.repeat(15), 'a'.repeat(15), '🔒'.repeat(15), 'a'.repeat(128), '🔒'.repeat(128), ' exact password e\u0301 ']) assert.equal(passwordError(password), undefined);
});
test('non-bookable event and category states cannot proceed', () => {
  const base = structuredClone(MOCK_EVENTS[0]);
  assert.equal(getBookingState(base).canBook, true);
  for (const status of ['CANCELLED','COMPLETED','UNAVAILABLE']) assert.equal(getBookingState({ ...base, status }).canBook, false);
  for (const availability of ['SOLD_OUT','NOT_YET_OPEN','SALE_ENDED']) {
    const event = { ...base, categories: base.categories.map(c => ({ ...c, availability })) };
    assert.equal(getBookingState(event).canBook, false);
    assert.equal(isCategoryBookable(event, event.categories[0]), false);
  }
  assert.equal(getBookingState({ ...base, categories: [] }).canBook, false);
  assert.equal(getBookingState({ ...base, categories: base.categories.map(c => ({...c, status:'DISABLED'})) }).canBook, false);
  assert.equal(isCategoryBookable(base, {...base.categories[0], remaining:0}), false);
});
test('event responses validate media, status, pricing and dates before rendering', () => {
  assert.ok(MOCK_EVENTS.every(isEventPayload));
  assert.equal(isEventPayload({}), false);
  assert.equal(isEventPayload({...MOCK_EVENTS[0], startsAt:'bad'}), false);
  assert.equal(isEventPayload({...MOCK_EVENTS[0], posterUrl:'javascript:alert(1)'}), false);
  assert.equal(isEventPayload({...MOCK_EVENTS[0], categories:[{...MOCK_EVENTS[0].categories[0],price:-1}]}), false);
});
test('date filters use the Philippines calendar across UTC midnight', () => {
  const now = new Date('2026-10-17T18:00:00Z'); // Sunday in Manila
  assert.equal(matchesDate('2026-10-18T20:00:00+08:00','today',now), true);
  assert.equal(matchesDate('2026-10-17T20:00:00+08:00','today',now), false);
  assert.equal(matchesDate('2026-10-18T20:00:00+08:00','weekend',now), true);
  assert.equal(matchesDate('2026-10-19T20:00:00+08:00','weekend',now), false);
});

test('existing events API handles detail 404, malformed lists and network failures without mock success', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.API_URL;
  process.env.API_URL = 'https://api.example.invalid';
  cache.delete(path.resolve(root, 'src/lib/events-api.ts'));
  const api = load('src/lib/events-api.ts');
  t.after(() => { globalThis.fetch = originalFetch; if (originalUrl === undefined) delete process.env.API_URL; else process.env.API_URL = originalUrl; });
  globalThis.fetch = async () => new Response('', {status:404});
  assert.equal(await api.getEventById('missing'), null);
  globalThis.fetch = async () => new Response(JSON.stringify(MOCK_EVENTS[0]), {status:200});
  assert.equal((await api.getEventById(MOCK_EVENTS[0].id)).id, MOCK_EVENTS[0].id);
  await assert.rejects(api.getEventById('different-id'), /different event/);
  globalThis.fetch = async () => new Response(JSON.stringify({data:MOCK_EVENTS}), {status:200});
  assert.equal((await api.getEvents()).length, MOCK_EVENTS.length);
  globalThis.fetch = async () => new Response(JSON.stringify({data:[{id:'broken'}]}), {status:200});
  await assert.rejects(api.getEvents(), /unsupported event list/);
  globalThis.fetch = async () => new Response('', {status:503});
  await assert.rejects(api.getEvents(), /503/);
  globalThis.fetch = async () => { throw new TypeError('network'); };
  await assert.rejects(api.getEvents(), /Could not reach/);
});

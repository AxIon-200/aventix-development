import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const { saveProfile } = load('src/lib/auth/save-profile.ts');
const user = (changes = {}) => ({ id: 'attendee-1', firstName: 'Ana', lastName: 'Cruz',
  name: 'Ana Cruz', email: 'ana@example.invalid', phoneNumber: '+639171234567', role: 'ATTENDEE',
  status: 'ACTIVE', emailVerified: true, termsVersion: 'fixture',
  termsAcceptedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...changes });
const json = body => new Response(JSON.stringify(body));

test('a lost save confirms only submitted canonical values with one uncached read and no replay', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'PATCH') throw Error('response lost');
    return json({ data: { user: user({ firstName: 'Maria', lastName: 'Concurrent', name: 'Maria Concurrent', phoneNumber: '+639179998888' }) } });
  });
  const result = await saveProfile(client, user(), { firstName: '  Maria  ', phoneNumber: '09179998888' });
  assert.equal(result.reconciled, true);
  assert.equal(result.profile.name, 'Maria Concurrent');
  assert.deepEqual(calls.map(call => [call.url, call.method, call.cache]), [
    ['/api/v1/me', 'PATCH', 'no-store'], ['/api/v1/me', 'GET', 'no-store'],
  ]);
});

test('unusable mutation responses reconcile a cleared phone without replay', async () => {
  for (const reply of [() => new Response('{'), () => json({ data: {} }), () => json({ data: { user: user({ id: 'other' }) } })]) {
    const methods = [];
    const client = createBetterAuthClient(async (_url, options) => {
      methods.push(options.method);
      return options.method === 'PATCH' ? reply() : json({ data: { user: user({ phoneNumber: null }) } });
    });
    assert.equal((await saveProfile(client, user(), { phoneNumber: null })).profile.phoneNumber, null);
    assert.deepEqual(methods, ['PATCH', 'GET']);
  }
});

test('mismatched, unavailable, malformed, or different-account reads leave the save uncertain', async () => {
  for (const read of [
    () => json({ data: { user: user({ firstName: 'Another tab' }) } }),
    () => { throw Error('offline'); },
    () => new Response('{'),
    () => json({ data: { user: user({ id: 'other', firstName: 'Maria' }) } }),
  ]) {
    const methods = [];
    const client = createBetterAuthClient(async (_url, options) => {
      methods.push(options.method);
      if (options.method === 'PATCH') throw Error('lost');
      return read();
    });
    const changes = { firstName: 'Maria' };
    await assert.rejects(saveProfile(client, user(), changes), { code: 'REQUEST_UNCERTAIN' });
    assert.deepEqual(changes, { firstName: 'Maria' });
    assert.deepEqual(methods, ['PATCH', 'GET']);
  }
});

test('a later explicit save sends only selected fields after a concurrent edit', async () => {
  const requests = [];
  let first = true;
  const client = createBetterAuthClient(async (_url, options) => {
    requests.push({ method: options.method, body: options.body && JSON.parse(options.body) });
    if (options.method === 'PATCH' && first) { first = false; throw Error('lost'); }
    return json({ data: { user: user({ firstName: options.method === 'PATCH' ? 'Maria' : 'Concurrent', lastName: 'Other tab' }) } });
  });
  await assert.rejects(saveProfile(client, user(), { firstName: 'Maria' }), { code: 'REQUEST_UNCERTAIN' });
  const result = await saveProfile(client, user(), { firstName: 'Maria' });
  assert.equal(result.reconciled, false);
  assert.equal(result.profile.lastName, 'Other tab');
  assert.deepEqual(requests, [{ method: 'PATCH', body: { firstName: 'Maria' } },
    { method: 'GET', body: undefined }, { method: 'PATCH', body: { firstName: 'Maria' } }]);
});

test('defined rejection does not reconcile and a reconciliation read preserves eligibility gates', async () => {
  for (const rejectedMutation of [true, false]) {
    const methods = [];
    const client = createBetterAuthClient(async (_url, options) => {
      methods.push(options.method);
      if (options.method === 'PATCH' && !rejectedMutation) throw Error('lost');
      return new Response(JSON.stringify({ error: { code: rejectedMutation ? 'VALIDATION_ERROR' : 'AUTHENTICATION_REQUIRED' } }), { status: rejectedMutation ? 400 : 401 });
    });
    await assert.rejects(saveProfile(client, user(), { firstName: 'Maria' }), {
      code: rejectedMutation ? 'VALIDATION_ERROR' : 'AUTHENTICATION_REQUIRED',
    });
    assert.deepEqual(methods, rejectedMutation ? ['PATCH'] : ['PATCH', 'GET']);
  }
});

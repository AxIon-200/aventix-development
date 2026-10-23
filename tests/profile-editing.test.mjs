import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const user = (changes = {}) => ({ id: 'attendee-1', firstName: 'Ana', lastName: 'Cruz',
  name: 'Ana Cruz', email: 'ana@example.invalid', phoneNumber: '+639171234567', role: 'ATTENDEE',
  status: 'ACTIVE', emailVerified: true, termsVersion: 'fixture',
  termsAcceptedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z', ...changes });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('profile PATCH sends only allowed supplied fields and uses the canonical response', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { user: user({ firstName: 'Éloïse', name: 'Éloïse Cruz' }) } });
  });
  const saved = await client.updateProfile({ firstName: '  Éloïse  ', email: 'hijack@example.invalid',
    role: 'ADMINISTRATOR', name: 'Forged', phoneNumber: undefined });
  assert.deepEqual(calls.map(call => call.url), ['/api/v1/me']);
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(calls[0].options.credentials, 'include');
  assert.deepEqual(JSON.parse(calls[0].options.body), { firstName: 'Éloïse' });
  assert.deepEqual(saved, { id: 'attendee-1', firstName: 'Éloïse', lastName: 'Cruz',
    name: 'Éloïse Cruz', email: 'ana@example.invalid', phoneNumber: '+639171234567', role: 'ATTENDEE' });
});

test('profile phone can be cleared without changing the names', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { user: user({ phoneNumber: null }) } });
  });
  assert.equal((await client.updateProfile({ phoneNumber: null })).phoneNumber, null);
  assert.deepEqual(JSON.parse(calls[0].options.body), { phoneNumber: null });
});

test('rejected or lost profile updates never retry and never claim success', async () => {
  for (const response of [
    () => json({ error: { code: 'VALIDATION_ERROR', fields: { firstName: 'private', email: 'private' } } }, 400),
    () => { throw Error('lost response'); },
    () => new Response('{'),
    () => json({ data: { user: user({ phoneNumber: 7 }) } }),
  ]) {
    const calls = [];
    const client = createBetterAuthClient(async (url, options) => { calls.push({ url, options }); return response(); });
    await assert.rejects(client.updateProfile({ firstName: 'Changed' }), error =>
      ['VALIDATION_ERROR', 'REQUEST_UNCERTAIN'].includes(error.code) && !JSON.stringify(error).includes('private'));
    assert.deepEqual(calls.map(call => call.url), ['/api/v1/me']);
  }
});

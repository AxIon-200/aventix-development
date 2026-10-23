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

test('authenticated password change sends exact passwords and no confirmation', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { passwordChanged: true } });
  });
  await client.changePassword({ currentPassword: ' old Unicode e\u0301 ', newPassword: ' new Unicode 😀 pass ', confirmPassword: 'do not send' });
  assert.deepEqual(calls.map(call => call.url), ['/api/auth/change-password']);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.credentials, 'include');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    currentPassword: ' old Unicode e\u0301 ', newPassword: ' new Unicode 😀 pass ',
  });
});

test('password rejections stay specific while lost or unusable responses stay uncertain without retry', async () => {
  for (const [reply, code] of [
    [() => json({ error: { code: 'CURRENT_PASSWORD_INCORRECT' } }, 401), 'CURRENT_PASSWORD_INCORRECT'],
    [() => json({ error: { code: 'PASSWORD_REUSE' } }, 400), 'PASSWORD_REUSE'],
    [() => json({ error: { code: 'VALIDATION_ERROR', fields: { newPassword: 'private' } } }, 400), 'VALIDATION_ERROR'],
    [() => { throw Error('lost'); }, 'REQUEST_UNCERTAIN'],
    [() => json({ data: { passwordChanged: false } }), 'REQUEST_UNCERTAIN'],
  ]) {
    const calls = [];
    const client = createBetterAuthClient(async (url, options) => { calls.push({ url, options }); return reply(); });
    await assert.rejects(client.changePassword({ currentPassword: 'old', newPassword: 'new' }), error =>
      error.code === code && !JSON.stringify(error).includes('private'));
    assert.deepEqual(calls.map(call => call.url), ['/api/auth/change-password']);
  }
});

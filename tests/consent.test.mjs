import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const input = { email: ' OWNER+tag@EXAMPLE.invalid ', currentPassword: ' exact password e\u0301 ', termsAccepted: true, termsVersion: 'fixture-v1' };

test('legacy consent submits only approved fields and confirms acceptance without requesting a session', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { termsAccepted: true } });
  });
  await client.acceptTerms({ ...input, role: 'ADMINISTRATOR', callbackURL: '/admin', termsAcceptedAt: 'forged', password: 'other' });
  assert.deepEqual(calls.map(call => call.url), ['/api/auth/accept-terms']);
  assert.deepEqual(JSON.parse(calls[0].options.body), { ...input, email: 'owner+tag@example.invalid' });
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.cache, 'no-store');
});

test('lost or unsupported consent responses remain uncertain and are never retried', async () => {
  for (const respond of [() => { throw Error('lost'); }, () => new Response('{'),
    () => json({ error: { code: 'BAD_GATEWAY' } }, 502), () => json({ data: { termsAccepted: false } })]) {
    const calls = [];
    const client = createBetterAuthClient(async url => { calls.push(url); return respond(); });
    await assert.rejects(client.acceptTerms(input), error => error.code === 'REQUEST_UNCERTAIN');
    assert.deepEqual(calls, ['/api/auth/accept-terms']);
  }
});

test('consent preserves server gates, stale terms, safe errors and Retry-After', async () => {
  for (const [code, status] of [['INVALID_CREDENTIALS', 401], ['ACCOUNT_DISABLED', 403],
    ['EMAIL_VERIFICATION_REQUIRED', 403], ['PASSWORD_RESET_REQUIRED', 403],
    ['TERMS_VERSION_OUTDATED', 409], ['RATE_LIMITED', 429]]) {
    const client = createBetterAuthClient(async () => json({ error: { code, message: 'private' } }, status, { 'Retry-After': '37' }));
    await assert.rejects(client.acceptTerms(input), error => error.code === code && error.retryAfter === 37 && !error.message.includes('private'));
  }
  const client = createBetterAuthClient(async () => json({ error: { code: 'VALIDATION_ERROR', fields: {
    email: 'private', currentPassword: 'private', termsVersion: 'private', role: 'private',
  } } }, 400));
  await assert.rejects(client.acceptTerms(input), error => error.code === 'VALIDATION_ERROR' &&
    error.fieldErrors.email && error.fieldErrors.currentPassword && error.fieldErrors.terms && !error.fieldErrors.role);
});

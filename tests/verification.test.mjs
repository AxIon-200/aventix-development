import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test('verification submits only the token and exact current password without login or account reads', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { emailVerified: true } });
  });
  await client.verifyEmail({ token: 'email-fixture', currentPassword: ' exact e\u0301 password ', callbackURL: 'https://evil.invalid' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/auth/verify-email');
  assert.deepEqual(JSON.parse(calls[0].options.body), { token: 'email-fixture', currentPassword: ' exact e\u0301 password ' });
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.cache, 'no-store');
});

test('explicit resend normalizes only email and requires the exact generic result for every eligible or suppressed outcome', async () => {
  const calls = [];
  const generic = 'If this address is eligible, a verification email will be sent.';
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { message: generic } });
  });
  await client.resendVerification({ email: ' OWNER+tag@EXAMPLE.invalid ', callbackURL: 'https://evil.invalid' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/auth/resend-verification');
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'owner+tag@example.invalid' });
  assert.equal(calls[0].options.credentials, 'include');
  for (const respond of [() => json({ data: { message: 'Email sent to an existing account' } }), () => { throw Error('lost'); }]) {
    await assert.rejects(createBetterAuthClient(async () => respond()).resendVerification({ email: 'owner@example.invalid' }), error => error.code === 'REQUEST_UNCERTAIN');
  }
});

test('verification preserves actionable safe errors, retry guidance and ambiguous completion without resubmitting', async () => {
  for (const [code, status] of [['CURRENT_PASSWORD_INCORRECT', 401], ['LINK_INVALID_OR_EXPIRED', 400], ['PASSWORD_RESET_REQUIRED', 403], ['RATE_LIMITED', 429]]) {
    const client = createBetterAuthClient(async () => json({ error: { code, message: 'sensitive provider payload' } }, status, { 'Retry-After': '45' }));
    await assert.rejects(client.verifyEmail({ token: 'fixture', currentPassword: 'wrong' }), error => error.code === code && error.retryAfter === 45 && !error.message.includes('sensitive'));
  }
  for (const respond of [() => { throw Error('offline'); }, () => new Response('truncated'), () => json({ data: {} }), () => json({ error: { code: 'INTERNAL_ERROR' } }, 502)]) {
    let submissions = 0;
    const client = createBetterAuthClient(async () => { submissions++; return respond(); });
    await assert.rejects(client.verifyEmail({ token: 'fixture', currentPassword: 'exact' }), error => error.code === 'REQUEST_UNCERTAIN');
    assert.equal(submissions, 1);
  }
});

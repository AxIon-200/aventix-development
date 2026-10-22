import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test('recovery submits only normalized email and accepts the approved generic response', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { message: 'If an account exists for this address, a password-reset email will be sent.' } });
  });
  await client.requestPasswordReset({ email: ' OWNER+tag@EXAMPLE.invalid ', redirectTo: 'https://evil.invalid' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/auth/request-password-reset');
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'owner+tag@example.invalid' });
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.cache, 'no-store');
});

test('lost or unsupported recovery responses remain uncertain without automatic resubmission', async () => {
  for (const operation of ['requestPasswordReset', 'resetPassword']) {
    for (const respond of [() => { throw Error('lost'); }, () => new Response('truncated'), () => json({ data: {} }), () => json({ error: { code: 'INTERNAL_ERROR' } }, 502)]) {
      let submissions = 0;
      const client = createBetterAuthClient(async () => { submissions++; return respond(); });
      await assert.rejects(client[operation]({ email: 'owner@example.invalid', token: 'fixture', newPassword: 'exact replacement password' }), error => error.code === 'REQUEST_UNCERTAIN');
      assert.equal(submissions, 1);
    }
  }
});

test('recovery preserves safe reset errors and Retry-After guidance', async () => {
  for (const [code, status] of [['PASSWORD_REUSE', 400], ['LINK_INVALID_OR_EXPIRED', 400], ['RATE_LIMITED', 429]]) {
    const client = createBetterAuthClient(async () => json({ error: { code, message: 'private provider payload' } }, status, { 'Retry-After': '45' }));
    await assert.rejects(client.resetPassword({ token: 'fixture', newPassword: ' exact replacement password ' }), error => error.code === code && error.retryAfter === 45 && !error.message.includes('private'));
  }
});

test('reset submits only token and exact newPassword without preflight or replacement login', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { passwordReset: true } });
  });
  assert.equal(client.verifyRecoveryLink, undefined);
  await client.resetPassword({ token: 'reset-fixture', newPassword: ' exact e\u0301 password ', confirmPassword: 'discard', callbackURL: 'https://evil.invalid' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/auth/reset-password');
  assert.deepEqual(JSON.parse(calls[0].options.body), { token: 'reset-fixture', newPassword: ' exact e\u0301 password ' });
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.cache, 'no-store');
});

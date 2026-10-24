import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const passwords = { currentPassword: ' exact current e\u0301 password ', newPassword: ' new password 😀 ' };

test('password-change account gates and throttling remain specific without replay or provider detail', async () => {
  for (const [status, code] of [
    [401, 'AUTHENTICATION_REQUIRED'], [403, 'ACCOUNT_DISABLED'],
    [403, 'EMAIL_VERIFICATION_REQUIRED'], [403, 'TERMS_ACCEPTANCE_REQUIRED'],
    [403, 'PASSWORD_RESET_REQUIRED'], [429, 'RATE_LIMITED'],
  ]) {
    const calls = [];
    const client = createBetterAuthClient(async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ error: { code, message: 'private provider detail' } }),
        { status, headers: { 'Retry-After': '60' } });
    });
    await assert.rejects(client.changePassword(passwords), error => {
      assert.equal(error.code, code);
      assert.equal(error.retryAfter, 60);
      assert.doesNotMatch(JSON.stringify(error), /private provider detail/);
      return true;
    });
    assert.deepEqual(calls.map(call => call.url), ['/api/auth/change-password']);
    assert.deepEqual(JSON.parse(calls[0].options.body), passwords);
  }
});

test('password validation exposes safe field instructions and preserves no provider message', async () => {
  const client = createBetterAuthClient(async () => new Response(JSON.stringify({ error: {
    code: 'VALIDATION_ERROR', message: 'private provider detail',
    fields: { currentPassword: 'private current password', newPassword: 'private new password', secret: 'private secret' },
  } }), { status: 400 }));
  await assert.rejects(client.changePassword(passwords), error => {
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.deepEqual(error.fieldErrors, {
      currentPassword: 'Enter your current password using at most 128 Unicode characters.',
      newPassword: 'Use 15–128 Unicode characters. Spaces are allowed.',
    });
    assert.doesNotMatch(JSON.stringify(error), /private/);
    return true;
  });
});

test('service failure and unusable password-change replies remain uncertain and are never replayed', async () => {
  for (const response of [
    () => new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'private' } }), { status: 500 }),
    () => new Response('{'),
    () => new Response(JSON.stringify({ data: { passwordChanged: true }, error: { code: 'PRIVATE' } })),
    () => new Response(JSON.stringify({ data: { passwordChanged: 'true' } })),
    () => { throw Error('private network failure'); },
  ]) {
    const calls = [];
    const client = createBetterAuthClient(async url => { calls.push(url); return response(); });
    await assert.rejects(client.changePassword(passwords), error => error.code === 'REQUEST_UNCERTAIN');
    assert.deepEqual(calls, ['/api/auth/change-password']);
  }
});

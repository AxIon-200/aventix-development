import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const { nameError } = load('src/lib/auth/validation.ts');
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test('registration loads current terms and sends only approved fields without requesting a session', async () => {
  const calls = [];
  const terms = { version: 'fixture-v1', documentUrl: 'https://example.invalid/fixture-terms-v1' };
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return url === '/api/v1/terms' ? json({ data: terms }) : json({ data: { verificationRequired: true } }, 201);
  });
  assert.deepEqual(await client.getTerms(), terms);
  const password = ' exact password e\u0301 🔒 ';
  assert.equal(await client.registerAttendee({ firstName: ' Ana ', lastName: ' Cruz ', email: ' ANA+tag@EXAMPLE.invalid ',
    password, termsAccepted: true, termsVersion: terms.version, phoneNumber: '',
    confirmPassword: password, name: 'Fake', role: 'ADMINISTRATOR', status: 'ACTIVE',
    termsAcceptedAt: '2026-01-01', callbackURL: '/admin', rememberMe: true }), undefined);
  assert.deepEqual(calls.map(call => call.url), ['/api/v1/terms', '/api/auth/register']);
  assert.deepEqual(JSON.parse(calls[1].options.body), { firstName: 'Ana', lastName: 'Cruz', email: 'ana+tag@example.invalid',
    password, termsAccepted: true, termsVersion: 'fixture-v1' });
  for (const { options } of calls) {
    assert.equal(options.credentials, 'include');
    assert.equal(options.cache, 'no-store');
  }
});

test('names count trimmed Unicode code points and reject unsupported input', () => {
  for (const name of [' 🪩 ', ` ${'🪩'.repeat(100)} `, 'e\u0301']) assert.equal(nameError(name), undefined);
  for (const name of ['', '   ', 'a'.repeat(101), '🪩'.repeat(101), '\ud800', 'Ana\u0000']) assert.ok(nameError(name));
});

test('terms reject unavailable or unsafe documents and can be explicitly retried', async () => {
  const valid = { version: 'fixture-v2', documentUrl: 'https://example.invalid/fixture-v2' };
  for (const terms of [null, {}, { version: '', documentUrl: valid.documentUrl }, { version: 'v1', documentUrl: 'javascript:alert(1)' },
    { version: 'v1', documentUrl: 'https://user:secret@example.invalid/terms' }, { version: 'v1', documentUrl: '/legal/terms' }]) {
    await assert.rejects(createBetterAuthClient(async () => json({ data: terms })).getTerms(), error => error.code === 'INVALID_RESPONSE');
  }
  let available = false;
  const client = createBetterAuthClient(async () => available ? json({ data: valid }) : json({ error: { code: 'INTERNAL_ERROR' } }, 503));
  await assert.rejects(client.getTerms(), error => error.code === 'UNAVAILABLE');
  available = true;
  assert.deepEqual(await client.getTerms(), valid);
});

test('lost or unsupported registration responses stay uncertain and never retry or request a session', async () => {
  for (const respond of [() => { throw Error('lost'); }, () => new Response('{'), () => json({ error: { code: 'BAD_GATEWAY' } }, 502), () => json({ data: { user: { id: 'unexpected' } } }), () => json({ user: {} })]) {
    const calls = [];
    const client = createBetterAuthClient(async url => { calls.push(url); return respond(); });
    await assert.rejects(client.registerAttendee({ firstName: 'Ana', lastName: 'Cruz', email: 'ana@example.invalid',
      password: ' exact password ', termsAccepted: true, termsVersion: 'fixture-v1' }), error => ['REQUEST_UNCERTAIN', 'INVALID_RESPONSE'].includes(error.code));
    assert.deepEqual(calls, ['/api/auth/register']);
  }
});

test('registration preserves actionable outcomes, safe field errors and Retry-After without retries', async () => {
  const input = { firstName: 'Ana', lastName: 'Cruz', email: 'ana@example.invalid', password: ' exact password ', termsAccepted: true, termsVersion: 'fixture-v1' };
  for (const [code, status] of [['EMAIL_ALREADY_REGISTERED', 409], ['ACCOUNT_CREATED_EMAIL_FAILED', 503], ['TERMS_VERSION_OUTDATED', 409], ['RATE_LIMITED', 429]]) {
    const calls = [];
    const client = createBetterAuthClient(async url => {
      calls.push(url);
      return json({ error: { code, message: 'private provider text' } }, status, { 'Retry-After': '60' });
    });
    await assert.rejects(client.registerAttendee(input), error => error.code === code && error.retryAfter === 60 && !error.message.includes('private'));
    assert.deepEqual(calls, ['/api/auth/register']);
  }
  const client = createBetterAuthClient(async () => json({ error: { code: 'VALIDATION_ERROR', fields: {
    firstName: 'private', lastName: 'private', phoneNumber: 'private', password: 'private', termsAccepted: 'private', role: 'private',
  } } }, 400));
  await assert.rejects(client.registerAttendee(input), error =>
    error.code === 'VALIDATION_ERROR' && error.fieldErrors.firstName && error.fieldErrors.lastName && error.fieldErrors.phoneNumber && error.fieldErrors.terms && !error.fieldErrors.role && !JSON.stringify(error).includes('private'));
});

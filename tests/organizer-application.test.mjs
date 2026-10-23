import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('organizer application sends only allowlisted fields and requires both verification and approval', async () => {
  const calls = [];
  const client = createBetterAuthClient(async (url, options) => {
    calls.push({ url, options });
    return json({ data: { verificationRequired: true, administratorApprovalRequired: true } }, 201);
  });
  const password = ' exact organizer passphrase ';
  await client.registerOrganizer({ firstName: ' Ana ', lastName: ' Cruz ', email: ' ANA@EXAMPLE.invalid ',
    phoneNumber: '', password, organizationName: ' Music Org ', organizationDescription: ' Live music in Manila ',
    termsAccepted: true, termsVersion: 'v1', confirmPassword: password, role: 'ADMINISTRATOR' });
  assert.deepEqual(calls.map(call => call.url), ['/api/v1/organizer-applications']);
  assert.deepEqual(JSON.parse(calls[0].options.body), { firstName: 'Ana', lastName: 'Cruz', email: 'ana@example.invalid',
    password, organizationName: 'Music Org', organizationDescription: 'Live music in Manila',
    termsAccepted: true, termsVersion: 'v1' });
});

test('a lost organizer application response is uncertain and is not retried', async () => {
  const calls = [];
  const client = createBetterAuthClient(async url => { calls.push(url); throw Error('lost'); });
  await assert.rejects(client.registerOrganizer({ firstName: 'Ana', lastName: 'Cruz', email: 'ana@example.invalid',
    password: 'long organizer password', organizationName: 'Music Org',
    organizationDescription: 'Live music in Manila', termsAccepted: true, termsVersion: 'v1' }),
  error => error.code === 'REQUEST_UNCERTAIN');
  assert.deepEqual(calls, ['/api/v1/organizer-applications']);
});

test('an unusable organizer application response is uncertain and is not retried', async () => {
  const calls = [];
  const client = createBetterAuthClient(async url => {
    calls.push(url);
    return json({ unexpected: true }, 200);
  });
  await assert.rejects(client.registerOrganizer({ firstName: 'Ana', lastName: 'Cruz', email: 'ana@example.invalid',
    password: 'long organizer password', organizationName: 'Music Org',
    organizationDescription: 'Live music in Manila', termsAccepted: true, termsVersion: 'v1' }),
  error => error.code === 'REQUEST_UNCERTAIN');
  assert.deepEqual(calls, ['/api/v1/organizer-applications']);
});

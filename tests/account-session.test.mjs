import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { accountSession } = load('src/lib/auth/account-session.ts');

test('a remounted route can settle after the last account subscriber leaves', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  let unsubscribe;
  try {
    const session = { userId: 'attendee-1', role: 'ATTENDEE', displayName: 'Ana Cruz', canBook: true };
    const account = accountSession({ getSession: async () => session });
    const route = '/dashboard/tickets?';
    unsubscribe = account.subscribe(() => {});
    account.navigate('/dashboard?');
    await Promise.resolve();
    // The root observer may run before the old page releases its subscription.
    account.navigate(route);
    unsubscribe();
    unsubscribe = account.subscribe(() => {});
    await Promise.resolve();
    assert.equal(account.getSnapshot().session, session);
    assert.equal(account.getSnapshotForRoute(route).loading, true);
    // The route-scoped hook must record its route after subscribing as well.
    account.navigate(route);
    assert.equal(account.getSnapshotForRoute(route).loading, false);
    assert.equal(account.getSnapshotForRoute(route).session, session);
  } finally {
    unsubscribe?.();
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});

test('a settled account read becomes visible when the first route arrives later', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  try {
    const session = { userId: 'attendee-1', role: 'ATTENDEE', displayName: 'Ana Cruz', canBook: true };
    const account = accountSession({ getSession: async () => session });
    const seen = [];
    const unsubscribe = account.subscribe(() => seen.push(account.getSnapshotForRoute('/dashboard?')));
    try {
      await Promise.resolve();
      assert.equal(account.getSnapshot().session, session);
      assert.equal(account.getSnapshotForRoute('/dashboard?').loading, true);
      const before = seen.length;
      account.navigate('/dashboard?');
      assert.ok(seen.length > before);
      assert.equal(seen.at(-1).session, session);
      assert.equal(seen.at(-1).loading, false);
    } finally {
      unsubscribe();
    }
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});

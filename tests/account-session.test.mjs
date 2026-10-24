import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';

const { accountSession } = load('src/lib/auth/account-session.ts');

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
